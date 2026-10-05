// POSSE for Updates: reads the site's Updates JSON feed and posts each new
// update to Mastodon and Bluesky as a native post – full text, up to four
// images with their alt text, and hashtags. The link back to the site is
// only added when the text has to be trimmed to fit a platform's limit.
//
// The permalink of each syndicated copy is written to
// src/_data/syndication.json, keyed by the update's path on the site
// (e.g. "/updates/2026/10/04/143210/"). That file does double duty:
//   1. The site reads it to show "Also on Mastodon and Bluesky" links
//      (u-syndication) on each update.
//   2. This script reads it to know what has already been posted – an
//      update/platform pair with a URL in there is never posted again.
//
// Separate from scripts/toot-new-posts.mjs (blog posts) on purpose, so the
// two can't interfere with each other.
//
// Env vars (same ones the blog script uses):
//   FEED_URL              - the blog feed; its origin is used to find
//                           /updates/feed.json unless UPDATES_FEED_URL is set
//   UPDATES_FEED_URL      - optional override
//   MASTODON_INSTANCE_URL, MASTODON_TOKEN (token needs write:statuses and
//                           write:media scopes for images)
//   BLUESKY_HANDLE, BLUESKY_APP_PASSWORD (optional, both or neither)
//
// Writes `changed=true` to $GITHUB_OUTPUT when syndication.json changes, so
// the workflow knows to rebuild the site and show the new links.

import { readFile, writeFile, appendFile } from "node:fs/promises";

const FEED_URL = process.env.FEED_URL || "https://heartsoulmachine.com/feed.xml";
const UPDATES_FEED_URL =
  process.env.UPDATES_FEED_URL || new URL("/updates/feed.json", FEED_URL).href;

const MASTODON_INSTANCE_URL = (process.env.MASTODON_INSTANCE_URL || "").replace(/\/$/, "");
const MASTODON_TOKEN = process.env.MASTODON_TOKEN;
const MASTODON_ENABLED = Boolean(MASTODON_INSTANCE_URL && MASTODON_TOKEN);
const MASTODON_MAX_LENGTH = 500;

const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;
const BLUESKY_ENABLED = Boolean(BLUESKY_HANDLE && BLUESKY_APP_PASSWORD);
const BLUESKY_SERVICE_URL = process.env.BLUESKY_SERVICE_URL || "https://bsky.social";
const BLUESKY_MAX_LENGTH = 300;
const BLUESKY_MAX_IMAGE_BYTES = 1_000_000;

const SYNDICATION_PATH = "src/_data/syndication.json";
const MAX_IMAGES = 4; // both platforms allow four
const MAX_POSTS_PER_RUN = 5; // safety valve against floods
// Safety net: never syndicate anything older than this, so a lost or reset
// syndication.json can't dump the whole archive onto social media.
const MAX_AGE_HOURS = 72;

// ---------------------------------------------------------------- text --

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const graphemeLength = (s) => [...segmenter.segment(s)].length;

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Turns the update's HTML into plain text for social posts. Links keep
// their URL – "link text (https://…)" – unless the text already is the URL.
function htmlToText(html) {
  let s = html || "";
  s = s.replace(/<img[^>]*>/gi, ""); // images go as attachments instead
  s = s.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const url = decodeEntities(href);
    const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
    const bare = (u) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!text || bare(text) === bare(url)) return url;
    return `${text} (${url})`;
  });
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "• ");
  s = s.replace(/<\/li>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|blockquote|ul|ol|figure)>/gi, "\n\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return s
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toHashtag(tag) {
  return (
    "#" +
    String(tag)
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")
  );
}

// Cuts text to at most `budget` graphemes, preferring a word boundary.
function trimTo(text, budget) {
  const graphemes = [...segmenter.segment(text)].map((g) => g.segment);
  if (graphemes.length <= budget) return text;
  let cut = graphemes.slice(0, Math.max(0, budget - 1)).join("");
  const lastSpace = cut.search(/\s\S*$/);
  if (lastSpace > cut.length * 0.6) cut = cut.slice(0, lastSpace);
  return cut.replace(/[\s.,;:–-]+$/, "") + "…";
}

// Full text if it fits; otherwise trimmed text + link back to the update.
function composePost(item, maxLength) {
  const body = htmlToText(item.content_html);
  const hashtags = (item.tags || []).map(toHashtag).join(" ");
  const full = [body, hashtags].filter(Boolean).join("\n\n");
  if (graphemeLength(full) <= maxLength) return { text: full, trimmed: false };

  const tail = [item.url, hashtags].filter(Boolean).join("\n\n");
  const budget = maxLength - graphemeLength(tail) - 2;
  const text = [trimTo(body, Math.max(20, budget)), tail].join("\n\n");
  return { text, trimmed: true };
}

// ---------------------------------------------------------------- data --

async function loadSyndication() {
  try {
    return JSON.parse(await readFile(SYNDICATION_PATH, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err; // a malformed file must stop the run, not trigger re-posting
  }
}

async function saveSyndication(data) {
  const sorted = Object.fromEntries(Object.keys(data).sort().map((k) => [k, data[k]]));
  await writeFile(SYNDICATION_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

async function fetchUpdatesFeed() {
  const url = `${UPDATES_FEED_URL}${UPDATES_FEED_URL.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const res = await fetch(url, { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } });
  if (res.status === 404) return { items: [] }; // feature not deployed yet
  if (!res.ok) throw new Error(`Updates feed fetch failed: ${res.status}`);
  return res.json();
}

// Reads an image's width and height from its file header (PNG, JPEG, GIF,
// WebP), so Bluesky can show it at the right shape instead of guessing.
// Returns null if the format isn't recognised.
function imageSize(arrayBuffer) {
  const b = Buffer.from(arrayBuffer);
  if (b.length < 30) return null;
  // PNG
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  // GIF
  if (b.toString("ascii", 0, 3) === "GIF") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  // WebP
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  }
  // JPEG: walk the markers until a start-of-frame
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const length = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      }
      i += 2 + length;
    }
  }
  return null;
}

async function fetchImages(item) {
  const images = [];
  for (const photo of (item._photos || []).slice(0, MAX_IMAGES)) {
    try {
      const res = await fetch(photo.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      images.push({
        url: photo.url,
        alt: photo.alt || "",
        bytes: await res.arrayBuffer(),
        contentType: res.headers.get("content-type") || "image/jpeg",
      });
      if (!photo.alt) console.warn(`No alt text for ${photo.url}`);
    } catch (err) {
      console.warn(`Could not fetch image ${photo.url}: ${err.message}`);
    }
  }
  return images;
}

// ------------------------------------------------------------ mastodon --

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function uploadToMastodon(image) {
  const form = new FormData();
  form.append("file", new Blob([image.bytes], { type: image.contentType }), "image");
  if (image.alt) form.append("description", image.alt);

  const res = await fetch(`${MASTODON_INSTANCE_URL}/api/v2/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MASTODON_TOKEN}` },
    body: form,
  });
  if (!res.ok) throw new Error(`media upload ${res.status}: ${await res.text()}`);
  const media = await res.json();

  // 202 = still processing; a status can't attach it until it's done.
  if (res.status === 202 || !media.url) {
    for (let i = 0; i < 15; i++) {
      await sleep(2000);
      const check = await fetch(`${MASTODON_INSTANCE_URL}/api/v1/media/${media.id}`, {
        headers: { Authorization: `Bearer ${MASTODON_TOKEN}` },
      });
      if (check.status === 200) break;
    }
  }
  return media.id;
}

async function postToMastodon(item, images) {
  const { text } = composePost(item, MASTODON_MAX_LENGTH);
  const mediaIds = [];
  for (const image of images) {
    try {
      mediaIds.push(await uploadToMastodon(image));
    } catch (err) {
      console.warn(`Mastodon: image ${image.url} skipped: ${err.message}`);
    }
  }

  const params = new URLSearchParams({ status: text, visibility: "public" });
  for (const id of mediaIds) params.append("media_ids[]", id);

  const res = await fetch(`${MASTODON_INSTANCE_URL}/api/v1/statuses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MASTODON_TOKEN}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Mastodon ignores a repeat with the same key for an hour, which
      // guards against a double post if a run is retried.
      "Idempotency-Key": item.id,
    },
    body: params,
  });
  if (!res.ok) throw new Error(`Mastodon API error ${res.status}: ${await res.text()}`);
  return (await res.json()).url;
}

// ------------------------------------------------------------- bluesky --

async function blueskyLogin() {
  const res = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Bluesky login failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { accessJwt: data.accessJwt, did: data.did };
}

const byteLength = (s) => Buffer.byteLength(s, "utf8");

// Bluesky needs explicit byte ranges ("facets") to make links and hashtags
// clickable.
function blueskyFacets(text) {
  const facets = [];
  const add = (match, index, feature) => {
    const byteStart = byteLength(text.slice(0, index));
    facets.push({
      index: { byteStart, byteEnd: byteStart + byteLength(match) },
      features: [feature],
    });
  };
  for (const m of text.matchAll(/https?:\/\/[^\s)]+[^\s).,;:!?…]/g)) {
    add(m[0], m.index, { $type: "app.bsky.richtext.facet#link", uri: m[0] });
  }
  for (const m of text.matchAll(/(^|\s)(#[A-Za-z0-9]+)/g)) {
    const index = m.index + m[1].length;
    add(m[2], index, { $type: "app.bsky.richtext.facet#tag", tag: m[2].slice(1) });
  }
  return facets;
}

async function postToBluesky(session, item, images) {
  const { text } = composePost(item, BLUESKY_MAX_LENGTH);

  const embedded = [];
  for (const image of images) {
    if (image.bytes.byteLength > BLUESKY_MAX_IMAGE_BYTES) {
      console.warn(`Bluesky: ${image.url} is over 1 MB, skipped`);
      continue;
    }
    try {
      const res = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.repo.uploadBlob`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": image.contentType },
        body: image.bytes,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const entry = { image: (await res.json()).blob, alt: image.alt };
      const size = imageSize(image.bytes);
      if (size?.width && size?.height) entry.aspectRatio = size;
      embedded.push(entry);
    } catch (err) {
      console.warn(`Bluesky: image ${image.url} skipped: ${err.message}`);
    }
  }

  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    langs: ["en"],
  };
  const facets = blueskyFacets(text);
  if (facets.length) record.facets = facets;
  if (embedded.length) record.embed = { $type: "app.bsky.embed.images", images: embedded };

  const res = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ repo: session.did, collection: "app.bsky.feed.post", record }),
  });
  if (!res.ok) throw new Error(`Bluesky post failed ${res.status}: ${await res.text()}`);
  const { uri } = await res.json(); // at://did/app.bsky.feed.post/<rkey>
  return `https://bsky.app/profile/${BLUESKY_HANDLE}/post/${uri.split("/").pop()}`;
}

// ---------------------------------------------------------------- main --

async function main() {
  const platforms = [];
  if (MASTODON_ENABLED) platforms.push("mastodon");
  if (BLUESKY_ENABLED) platforms.push("bluesky");
  if (!platforms.length) {
    console.log("No platforms configured – nothing to do.");
    return;
  }

  const feed = await fetchUpdatesFeed();
  const syndication = await loadSyndication();
  const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;

  const pending = [...(feed.items || [])]
    .reverse() // oldest first
    .map((item) => {
      const key = new URL(item.url).pathname;
      const done = syndication[key] || {};
      return { item, key, todo: platforms.filter((p) => !done[p]) };
    })
    .filter(({ item, todo }) => {
      if (!todo.length) return false;
      if (new Date(item.date_published).getTime() < cutoff) {
        console.log(`Skipping ${item.url}: older than ${MAX_AGE_HOURS}h`);
        return false;
      }
      return true;
    })
    .slice(0, MAX_POSTS_PER_RUN);

  if (!pending.length) {
    console.log("No new updates.");
    return;
  }

  let changed = false;
  let blueskySession = null;

  for (const { item, key, todo } of pending) {
    const images = await fetchImages(item);
    syndication[key] ||= {};

    if (todo.includes("mastodon")) {
      try {
        syndication[key].mastodon = await postToMastodon(item, images);
        changed = true;
        console.log(`Mastodon: posted ${item.url} -> ${syndication[key].mastodon}`);
      } catch (err) {
        console.error(`Mastodon: failed for ${item.url}: ${err.message}`);
      }
    }

    if (todo.includes("bluesky")) {
      try {
        blueskySession ??= await blueskyLogin();
        syndication[key].bluesky = await postToBluesky(blueskySession, item, images);
        changed = true;
        console.log(`Bluesky: posted ${item.url} -> ${syndication[key].bluesky}`);
      } catch (err) {
        console.error(`Bluesky: failed for ${item.url}: ${err.message}`);
      }
    }

    if (!Object.keys(syndication[key]).length) delete syndication[key];
  }

  if (changed) {
    await saveSyndication(syndication);
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, "changed=true\n");
  }
  console.log("Done.");
}

// Exported for testing; only runs when executed directly.
export { htmlToText, composePost, blueskyFacets, imageSize };
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
