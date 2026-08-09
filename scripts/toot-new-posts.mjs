// Reads an RSS/Atom feed, works out which items haven't been posted yet,
// and posts new ones to Mastodon and (optionally) Bluesky independently -
// a failure on one platform doesn't block or duplicate on the other.
// Writes an updated record of what's been posted to each platform back to
// data/posted-guids.json.
//
// Required env vars (set as GitHub Actions secrets/vars):
//   FEED_URL              - e.g. https://heartsoulmachine.com/feed.xml
//   MASTODON_INSTANCE_URL - e.g. https://your.instance  (no trailing slash)
//   MASTODON_TOKEN        - access token with write:statuses scope
//
// Optional, to also post to Bluesky:
//   BLUESKY_HANDLE        - e.g. yourname.bsky.social
//   BLUESKY_APP_PASSWORD  - an App Password (Settings -> App Passwords),
//                            NOT your main account password
//   Both must be set together, or Bluesky posting is skipped entirely.
//
// State file: data/posted-guids.json - a JSON array of "platform:id"
// entries already posted (e.g. "mastodon:https://example.com/post-1").
// Entries from before Bluesky support are plain ids with no platform
// prefix; these are treated as already-posted Mastodon items on load, so
// existing history isn't lost. Each platform gets its own "first run":
// if a platform has zero history, every current feed item is recorded as
// already-posted for that platform WITHOUT actually posting, so turning
// on a new platform later doesn't dump your whole archive onto it.
//
// Hashtags: any <category> elements on a feed item become hashtags,
// CamelCased for screen-reader accessibility (e.g. "learning design"
// -> #LearningDesign). Posts with no categories just get no hashtags.

import { readFile, writeFile } from "node:fs/promises";
import Parser from "rss-parser";

const FEED_URL = process.env.FEED_URL;
const MASTODON_INSTANCE_URL = (process.env.MASTODON_INSTANCE_URL || "").replace(/\/$/, "");
const MASTODON_TOKEN = process.env.MASTODON_TOKEN;
const STATUSES_URL = `${MASTODON_INSTANCE_URL}/api/v1/statuses`;
const MEDIA_URL = `${MASTODON_INSTANCE_URL}/api/v2/media`;

const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;
const BLUESKY_SERVICE_URL = "https://bsky.social";
const BLUESKY_MAX_LENGTH = 300; // approximate - see buildBlueskyText note

const STATE_PATH = "data/posted-guids.json";
const MAX_POSTS_PER_RUN = 5; // safety valve against accidental floods
const STATUS_PREFIX = "NEW POST: "; // set to "" to drop the prefix entirely

if (!FEED_URL || !MASTODON_INSTANCE_URL || !MASTODON_TOKEN) {
  console.error("Missing FEED_URL, MASTODON_INSTANCE_URL, or MASTODON_TOKEN.");
  process.exit(1);
}

if ((BLUESKY_HANDLE && !BLUESKY_APP_PASSWORD) || (!BLUESKY_HANDLE && BLUESKY_APP_PASSWORD)) {
  console.warn(
    "Only one of BLUESKY_HANDLE / BLUESKY_APP_PASSWORD is set - Bluesky posting disabled this run."
  );
}
const BLUESKY_ENABLED = Boolean(BLUESKY_HANDLE && BLUESKY_APP_PASSWORD);

function itemId(item) {
  return item.guid || item.id || item.link;
}

async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    const arr = JSON.parse(raw);
    const set = new Set();
    for (const entry of arr) {
      if (entry.startsWith("mastodon:") || entry.startsWith("bluesky:")) {
        set.add(entry);
      } else {
        // Pre-multi-platform entry - treat as an already-posted Mastodon item.
        set.add(`mastodon:${entry}`);
      }
    }
    return set;
  } catch {
    return new Set(); // no state file yet
  }
}

async function saveState(idSet) {
  const sorted = Array.from(idSet).sort();
  await writeFile(STATE_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

// rss-parser gives back a category entry in different shapes depending on
// the feed's own <category> syntax: a plain string for text-content style
// (<category>X</category>), or an object for attribute style
// (<category term="X"/>) since that's what the Atom spec actually
// requires. This normalizes either into a plain string before it's turned
// into a hashtag below.
function categoryText(entry) {
  if (typeof entry === "string") return entry;
  if (entry?.$?.term) return entry.$.term;
  if (typeof entry?._ === "string") return entry._;
  return "";
}

// Turns a raw tag string into a CamelCase hashtag, e.g. "learning design"
// -> "#LearningDesign". CamelCasing multi-word hashtags (rather than
// #learningdesign) is a common accessibility convention - screen readers
// announce each capitalised word separately instead of reading the whole
// thing as one run-together word.
function toHashtag(tag) {
  return (
    "#" +
    tag
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
  );
}

function getHashtags(item) {
  return (item.categories || [])
    .map(categoryText)
    .filter(Boolean)
    .map(toHashtag);
}

// Prefix + title, then the feed's <summary>, then the link, then hashtags
// built from any <category> elements on the item. Edit the `parts` array
// to change what's included or reorder it.
function buildStatusText(item) {
  const title = (item.title || "").trim();
  const summary = (item.summary || "").trim();
  const link = item.link || "";
  const hashtags = getHashtags(item).join(" ");

  const parts = [`${STATUS_PREFIX}${title}`];
  if (summary) parts.push(summary);
  if (link) parts.push(link);
  if (hashtags) parts.push(hashtags);
  return parts.join("\n\n");
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, Math.max(0, maxLen - 1)) + "…";
}

// Bluesky's limit is 300 *grapheme clusters*, which JS string .length
// doesn't measure precisely for things like emoji or combining characters.
// This uses .length as a close-enough approximation - fine for plain
// title text, could overcount for exotic Unicode in a title.
//
// No summary here by design (there isn't room for title + link + hashtags
// + a meaningful summary in 300 chars). If the title itself is long, it
// gets truncated with an ellipsis so the link and hashtags always survive
// intact - the link in particular needs to stay a byte-for-byte match for
// the facet below to make it clickable.
function buildBlueskyText(item) {
  const rawTitle = `${STATUS_PREFIX}${(item.title || "").trim()}`;
  const link = item.link || "";
  const hashtags = getHashtags(item).join(" ");

  const fixedParts = [link, hashtags].filter(Boolean);
  const fixedLength = fixedParts.reduce((sum, p) => sum + p.length + 2, 0);
  const titleBudget = Math.max(20, BLUESKY_MAX_LENGTH - fixedLength);
  const title = truncate(rawTitle, titleBudget);

  return [title, link, hashtags].filter(Boolean).join("\n\n");
}

function utf8ByteLength(s) {
  return Buffer.byteLength(s, "utf8");
}

// AT Protocol needs "facets" - explicit byte-range annotations - to make
// a link or hashtag clickable/searchable. Just having the text present
// isn't enough, unlike Mastodon which auto-linkifies.
function buildBlueskyFacets(text, link, hashtagTokens) {
  const facets = [];

  if (link) {
    const idx = text.indexOf(link);
    if (idx !== -1) {
      const byteStart = utf8ByteLength(text.slice(0, idx));
      const byteEnd = byteStart + utf8ByteLength(link);
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#link", uri: link }],
      });
    }
  }

  for (const tag of hashtagTokens) {
    const idx = text.indexOf(tag);
    if (idx !== -1) {
      const byteStart = utf8ByteLength(text.slice(0, idx));
      const byteEnd = byteStart + utf8ByteLength(tag);
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: tag.slice(1) }],
      });
    }
  }

  return facets;
}

// Pulls an image URL from the feed's enclosure or media:content tag, if
// either is present on the item.
function getImageUrl(item) {
  if (item.enclosure?.url) return item.enclosure.url;

  const media = item["media:content"];
  if (media) {
    const candidates = Array.isArray(media) ? media : [media];
    for (const m of candidates) {
      const url = m?.$?.url;
      if (url) return url;
    }
  }
  return null;
}

// Downloads the image once - the raw bytes get reused for whichever
// platform(s) need them, rather than fetching it twice.
async function fetchImageBytes(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const bytes = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { bytes, contentType };
}

async function uploadImageToMastodon(bytes, contentType) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: contentType }), "image");

  const uploadRes = await fetch(MEDIA_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${MASTODON_TOKEN}` },
    body: form,
  });

  if (!uploadRes.ok) {
    throw new Error(`upload ${uploadRes.status}: ${await uploadRes.text()}`);
  }

  const data = await uploadRes.json();
  return data.id;
}

async function postToMastodon(text, mediaIds = []) {
  const params = new URLSearchParams({ status: text });
  for (const id of mediaIds) params.append("media_ids[]", id);

  const res = await fetch(STATUSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MASTODON_TOKEN}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mastodon API error ${res.status}: ${body}`);
  }
}

// Exchanges the app password for a short-lived session. Called once per
// run (lazily, on the first item that needs Bluesky), not once per post.
async function blueskyLogin() {
  const res = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Bluesky login failed ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return { accessJwt: data.accessJwt, did: data.did };
}

async function uploadBlueskyImage(accessJwt, bytes, contentType) {
  const res = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.repo.uploadBlob`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": contentType,
    },
    body: bytes,
  });

  if (!res.ok) {
    throw new Error(`Bluesky image upload failed ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.blob;
}

async function postToBluesky({ accessJwt, did, text, facets, imageBlob }) {
  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
  };
  if (facets.length) record.facets = facets;
  if (imageBlob) {
    record.embed = {
      $type: "app.bsky.embed.images",
      images: [{ image: imageBlob, alt: "" }],
    };
  }

  const res = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ repo: did, collection: "app.bsky.feed.post", record }),
  });

  if (!res.ok) {
    throw new Error(`Bluesky post failed ${res.status}: ${await res.text()}`);
  }
}

// Fetches the feed with a cache-busting query param and no-cache headers,
// rather than using parser.parseURL() directly. GitHub Pages sits behind a
// CDN, and a plain repeated request to the same feed URL can keep hitting
// a cached copy that predates your latest deploy - a unique URL each run
// forces a fresh copy from origin instead of just hoping the cache has
// expired by the time this runs.
async function fetchFeedXml(feedUrl) {
  const bustUrl = `${feedUrl}${feedUrl.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const res = await fetch(bustUrl, {
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!res.ok) {
    throw new Error(`Feed fetch failed: ${res.status}`);
  }
  return res.text();
}

async function main() {
  // rss-parser's Atom parser doesn't extract <category> at all by default
  // (only its RSS 2.0 parser does) - the second customField explicitly
  // pulls it in as `categories`, keepArray: true so multiple tags aren't
  // collapsed down to just the first one.
  const parser = new Parser({
    customFields: {
      item: ["media:content", ["category", "categories", { keepArray: true }]],
    },
  });
  const xml = await fetchFeedXml(FEED_URL);
  const feed = await parser.parseString(xml);
  const posted = await loadState();

  const enabledPlatforms = ["mastodon"];
  if (BLUESKY_ENABLED) enabledPlatforms.push("bluesky");

  // Oldest first, so a backlog (or a newly-enabled platform's first real
  // post) goes out in chronological order.
  const items = [...feed.items].reverse();

  // Each platform gets its own "first run": if it has zero history in the
  // state file, seed it with every current item, posting none, so turning
  // on Bluesky later doesn't dump the whole archive onto it.
  let seeded = false;
  for (const platform of enabledPlatforms) {
    const hasHistory = [...posted].some((e) => e.startsWith(`${platform}:`));
    if (!hasHistory) {
      console.log(`First run for ${platform}: seeding ${items.length} item(s), posting none.`);
      for (const item of items) posted.add(`${platform}:${itemId(item)}`);
      seeded = true;
    }
  }
  if (seeded) await saveState(posted);

  const pending = items
    .map((item) => ({
      item,
      platforms: enabledPlatforms.filter((p) => !posted.has(`${p}:${itemId(item)}`)),
    }))
    .filter((entry) => entry.platforms.length > 0);

  if (pending.length === 0) {
    console.log("No new items.");
    return;
  }

  const toProcess = pending.slice(0, MAX_POSTS_PER_RUN);
  if (pending.length > toProcess.length) {
    console.warn(
      `Found ${pending.length} item(s) needing posts, only processing the first ${toProcess.length} this run (MAX_POSTS_PER_RUN).`
    );
  }

  let blueskySession = null;

  for (const { item, platforms } of toProcess) {
    const id = itemId(item);
    const imageUrl = getImageUrl(item);
    let imageBytes = null; // fetched at most once, shared across platforms

    if (platforms.includes("mastodon")) {
      try {
        const text = buildStatusText(item);
        const mediaIds = [];

        if (imageUrl) {
          try {
            imageBytes ??= await fetchImageBytes(imageUrl);
            mediaIds.push(await uploadImageToMastodon(imageBytes.bytes, imageBytes.contentType));
          } catch (err) {
            console.warn(`Mastodon: could not attach image (${imageUrl}): ${err.message}`);
          }
        }

        console.log(`Mastodon: posting "${item.title}"`);
        await postToMastodon(text, mediaIds);
        posted.add(`mastodon:${id}`);
      } catch (err) {
        console.error(`Mastodon: failed to post "${item.title}": ${err.message}`);
        // left unmarked, so it's retried next run
      }
    }

    if (platforms.includes("bluesky")) {
      try {
        blueskySession ??= await blueskyLogin();

        const link = item.link || "";
        const hashtagTokens = getHashtags(item);
        const text = buildBlueskyText(item);

        let imageBlob = null;
        if (imageUrl) {
          try {
            imageBytes ??= await fetchImageBytes(imageUrl);
            imageBlob = await uploadBlueskyImage(
              blueskySession.accessJwt,
              imageBytes.bytes,
              imageBytes.contentType
            );
          } catch (err) {
            console.warn(`Bluesky: could not attach image (${imageUrl}): ${err.message}`);
          }
        }

        const facets = buildBlueskyFacets(text, link, hashtagTokens);
        console.log(`Bluesky: posting "${item.title}"`);
        await postToBluesky({ ...blueskySession, text, facets, imageBlob });
        posted.add(`bluesky:${id}`);
      } catch (err) {
        console.error(`Bluesky: failed to post "${item.title}": ${err.message}`);
        // left unmarked, so it's retried next run
      }
    }
  }

  await saveState(posted);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
