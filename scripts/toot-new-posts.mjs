// Reads an RSS/Atom feed, works out which items haven't been posted to
// Mastodon yet, toots the new ones (a fixed prefix + title, <summary>,
// link, hashtags built from any <category> tags, and any enclosure/media
// image attached natively), and writes an updated record of what's been
// posted back to data/posted-guids.json.
//
// Required env vars (set as GitHub Actions secrets/vars):
//   FEED_URL              - e.g. https://heartsoulmachine.com/feed.xml
//   MASTODON_INSTANCE_URL - e.g. https://your.instance  (no trailing slash)
//   MASTODON_TOKEN        - access token with write:statuses scope
//
// State file: data/posted-guids.json - a JSON array of item ids already
// posted. On the very first run, if this file is empty, every current feed
// item is recorded as "already posted" WITHOUT tooting, so you don't dump
// your entire back catalogue onto Mastodon in one go.
//
// Hashtags: any <category> elements on a feed item become hashtags,
// CamelCased for screen-reader accessibility (e.g. "learning design"
// -> #LearningDesign). Posts with no categories just get no hashtags -
// nothing to opt into per post beyond adding the front matter field your
// feed template reads.

import { readFile, writeFile } from "node:fs/promises";
import Parser from "rss-parser";

const FEED_URL = process.env.FEED_URL;
const MASTODON_INSTANCE_URL = (process.env.MASTODON_INSTANCE_URL || "").replace(/\/$/, "");
const MASTODON_TOKEN = process.env.MASTODON_TOKEN;
const STATUSES_URL = `${MASTODON_INSTANCE_URL}/api/v1/statuses`;
const MEDIA_URL = `${MASTODON_INSTANCE_URL}/api/v2/media`;
const STATE_PATH = "data/posted-guids.json";
const MAX_POSTS_PER_RUN = 5; // safety valve against accidental floods
const STATUS_PREFIX = "NEW POST: "; // set to "" to drop the prefix entirely

if (!FEED_URL || !MASTODON_INSTANCE_URL || !MASTODON_TOKEN) {
  console.error("Missing FEED_URL, MASTODON_INSTANCE_URL, or MASTODON_TOKEN.");
  process.exit(1);
}

function itemId(item) {
  return item.guid || item.id || item.link;
}

async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    return new Set(JSON.parse(raw));
  } catch {
    return new Set(); // no state file yet
  }
}

async function saveState(idSet) {
  const sorted = Array.from(idSet).sort();
  await writeFile(STATE_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
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

// Prefix + title, then the feed's <summary>, then the link, then hashtags
// built from any <category> elements on the item (empty if there are
// none). Edit the `parts` array below to change what's included, drop
// STATUS_PREFIX above to "" if you don't want the prefix, or reorder to
// put hashtags before the link, etc.
function buildStatusText(item) {
  const title = (item.title || "").trim();
  const summary = (item.summary || "").trim();
  const link = item.link || "";
  const hashtags = (item.categories || []).map(toHashtag).join(" ");

  const parts = [`${STATUS_PREFIX}${title}`];
  if (summary) parts.push(summary);
  if (link) parts.push(link);
  if (hashtags) parts.push(hashtags);
  return parts.join("\n\n");
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

// Downloads the image and uploads it to Mastodon, returning the media id
// to attach to the status. Returns null (and logs a warning) on failure,
// so a broken image never blocks the toot itself.
async function uploadImage(imageUrl) {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`fetch ${imgRes.status}`);
    const bytes = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";

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
  } catch (err) {
    console.warn(`Could not attach image (${imageUrl}): ${err.message}`);
    return null;
  }
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

async function main() {
  const parser = new Parser({ customFields: { item: ["media:content"] } });
  const feed = await parser.parseURL(FEED_URL);
  const posted = await loadState();
  const isFirstRun = posted.size === 0;

  // Oldest first, so if there's a backlog to toot, it goes out in
  // chronological order rather than newest-first.
  const items = [...feed.items].reverse();

  const newItems = items.filter((item) => !posted.has(itemId(item)));

  if (isFirstRun) {
    console.log(
      `First run: seeding state with ${items.length} existing item(s), posting none.`
    );
    for (const item of items) posted.add(itemId(item));
    await saveState(posted);
    return;
  }

  if (newItems.length === 0) {
    console.log("No new items.");
    return;
  }

  const toPost = newItems.slice(0, MAX_POSTS_PER_RUN);
  if (newItems.length > toPost.length) {
    console.warn(
      `Found ${newItems.length} new items, only posting the first ${toPost.length} this run (MAX_POSTS_PER_RUN).`
    );
  }

  for (const item of toPost) {
    const text = buildStatusText(item);
    const imageUrl = getImageUrl(item);
    const mediaIds = [];

    if (imageUrl) {
      console.log(`Uploading image for: ${item.title}`);
      const mediaId = await uploadImage(imageUrl);
      if (mediaId) mediaIds.push(mediaId);
    }

    console.log(`Posting: ${item.title}`);
    await postToMastodon(text, mediaIds);
    posted.add(itemId(item));
    // Items we're deliberately skipping this run are left out of `posted`,
    // so they get picked up next run.
  }

  await saveState(posted);
  console.log(`Done. Posted ${toPost.length} item(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
