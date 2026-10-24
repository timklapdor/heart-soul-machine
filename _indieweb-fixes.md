# IndieWeb / microformats fixes – proposed, not applied

Source: indie.pablomurad.com report for heartsoulmachine.com (24 Oct 2026), plus a read-through of the templates in `src/_includes/` and `src/_data/`. Nothing has been changed yet. Each fix has an ID so you can approve, reject or tweak it one by one.

Priority key: **P1** – fixes a reported warning or failure. **P2** – a real bug found while reading templates. **P3** – nice to have.

---

## P1 – Reported problems

### F1. No representative h-card anywhere on the site
**Problem:** No template has an `h-card`, so parsers (webmention.io, Bridgy, readers) can't tell who owns the site. This is the report's top failure. The only author-ish markup is the hidden `rel="me"` Mastodon link in `grid.njk` line 120.

**Fix:** Add a sitewide h-card in `grid.njk`'s `<aside>`, outside `<article>`, so it's a top-level h-card on every page. On the homepage it becomes the *representative* h-card, because `u-url` and `u-uid` match the page URL. Make it a new partial, `partials/h-card.njk`:

```njk
<div class="h-card site-author">
  <a class="u-url u-uid p-name" href="https://heartsoulmachine.com/" rel="me">Tim Klapdor</a>
  <img class="u-photo" src="https://heartsoulmachine.com/assets/tim.jpg" alt="Tim Klapdor" hidden>
  <p class="p-note" hidden>Expert generalist working in higher education in Adelaide, Australia.</p>
  <span class="p-locality" hidden>Adelaide</span>, <span class="p-country-name" hidden>Australia</span>
</div>
```

It replaces the hidden Mastodon `<a rel="me">` on line 120, since the `<link rel="me">` tags in `<head>` already cover it.

**Decisions for you:**
- **Visible or hidden?** IndieWeb practice prefers visible markup. Options: (a) hidden, so nothing changes visually; (b) a small visible "by Tim Klapdor" with an avatar under the nav. I'd suggest (b), but (a) is fine to start with.
- **Photo:** there's no avatar in `src/assets/`. Do you want one added? If so, which image? Without one, leave out the `u-photo` line.

### F2. Orphaned `p-summary` on the homepage (and every page using `page.njk`)
**Problem:** `partials/page.njk` line 12 has `<div class="p-summary introduction">` inside a plain `<article>` with no `h-*` class. That's the orphaned property in the report. It affects Home, About, Now, Uses, Timeline, Tags and Search.

**Fix (recommended):** Remove the `p-summary` class from `page.njk` and keep `introduction`, so styling doesn't change. These are pages, not entries.

**Alternative:** Make `page.njk` an `h-entry` (add `h-entry`, `p-name`, `e-content`). That suits `/now/`, but not the homepage, so I'd go with the recommended fix.

### F3. Posts and notes are incomplete h-entries
**Problem:** `post.njk` and `note.njk` have `h-entry`, but:
- there's no `e-content`, so parsers can't find the body. Webmention receivers and Bridgy fall back to guessing.
- there's no `u-url`.
- `dt-published` is on an `<li>` holding "Apr 4, 2023" plus an SVG icon, with no machine-readable datetime.
- `p-author` is plain text ("Tim Klapdor"), not an h-card. That's why the report's "Posts with an author" fails.
- location uses `p-locality`, which isn't an h-entry property (it belongs to h-card/h-adr). The h-entry property is `p-location`.
- tags are all in one `p-category` element, so they parse as one category, "a, b & c".

**Fix, in `post.njk` (and the same changes in `note.njk`):**

```njk
<li class="date">{% include "icons/calendar.svg" %}
  <a class="u-url" href="{{ page.url }}"><time class="dt-published" datetime="{{ page.date | isoDateTime }}">{{ page.date | postDate }}</time></a></li>
...
<div class="e-content">
  {{ content | safe }}
</div>
...
{% if author | length %}<li class="author">{% include "icons/author.svg" %}<a class="p-author h-card" href="https://heartsoulmachine.com/">{{ author }}</a></li>{% endif %}
<li class="p-location location">...</li>
<li class="tags">{% include "icons/tag.svg" %}{%- for item in tags -%}<span class="p-category">{{ item }}</span>{% if loop.revindex == 2 %} & {% elseif not loop.last %}, {% endif %}{%- endfor -%}</li>
{% if updatedDate %}<li class="updatedDate">... <time class="dt-updated" datetime="{{ updatedDate | isoDateTime }}">{{ updatedDate | postDate }}</time></li>{% endif %}
```

**Required CSS change:** `main article` is a 7-column CSS grid, and its direct children (`p`, `div`, images, iframes, `blockquote.important`) are placed by `grid-column`. A wrapping `<div class="e-content">` would squash everything into column 4 and break wide images and embeds. Add this to `_main.scss`:

```scss
main article .e-content { display: contents; }
```

This keeps the children laid out on the article grid exactly as they are now.

**Check:** the `tags` list for posts includes the collection tag `posts`. Should `posts` and `notes` be filtered out of `p-category`? I'd say yes. Updates already use a separate `updateTags`.

Apply the same `p-category` per-tag change to `update.njk` line 16.

### F4. Relative og:image and og:url
**Problem:** In `grid.njk` (lines 14, 45–49) `og:image`, `og:image:secure_url` and `og:url` are relative paths. Mastodon, Bluesky, LinkedIn and Slack often ignore relative URLs, so link previews show no image. Only the updates branch (line 42) is absolute.

**Fix:** Prefix with the site URL, from `site.url` in `site.yaml`:

```njk
<meta property="og:url" content="{{ site.url }}{{ page.url }}" />
<meta property="og:image" content="{{ site.url }}/assets/social-previews/{{ title | slug }}-preview.jpeg" />
```

(and the same for `secure_url` and the default image). `page.url` already starts with `/`, and `site.url` has no trailing slash, so they join cleanly.

---

## P2 – Bugs found while reading templates

### F5. Typo in `src/_data/site.yaml`
**Problem:** Line 4 is `authorName": "Tim Klapdor"`. The stray quote makes the key `authorName"`, so `site.authorName` is undefined. Nothing uses it yet, but it's worth fixing before F1 or F4 rely on it.

**Fix:** `authorName: "Tim Klapdor"`

### F6. Category pages use the old `base.njk` layout
**Problem:** `src/category-archive.njk` is the only template still using `layouts/base.njk`. That layout has no `rel=me`, webmention, Micropub, IndieAuth or feed `<link>`s, uses relative og tags, reads `page.summary` (always empty), and has a leftover "Link to RSS" heading with no link. So every `/categories/*/` page drops out of the IndieWeb setup.

**Fix:** Switch `category-archive.njk` to `layout: partials/page.njk` (which wraps `grid.njk`). Then `base.njk` can be deleted, or kept for now and removed later.

### F7. Archive pages are marked as h-entry
**Problem:** `blog-archive.njk` and `note-archive.njk` put `h-entry` on the archive page itself, so `/blog/` parses as one big post. `updates-feed.njk` does this correctly with `h-feed`.

**Fix:** Change these to `h-feed`. In `blog-archive.njk`, mark each list item up as a minimal entry:

```njk
<li class="h-entry"><time class="dt-published" datetime="{{ post.date | isoDateTime }}">{{ post.data.date | dayMonthDate }}</time> – <a class="u-url p-name" href="{{ post.url }}">{{ post.data.title }}</a> ...</li>
```

(This also swaps the em dash in that line for an en dash.) For `note-archive.njk`, `h-feed` with `h-entry` + `u-url p-name` on each link.

### F8. Presentation cover image is a literal string
**Problem:** `presentation.njk` line 7 is `{{ 'coverImage' | url }}`, which outputs `coverImage`, not the image path. The same h-entry gaps as F3 apply here too (no `e-content` or `u-url`, `p-locality`, and the `p-summary` is on `description`, which is fine).

**Fix:** `{{ coverImage | url }}`, plus the F3 changes.

---

## P3 – Report tips and optional extras

### F9. robots.txt and sitemap.xml
**Problem:** Both return 404.

**Fix:** Add two templates:
- `src/robots.njk` → `/robots.txt`: allow all, plus `Sitemap: https://heartsoulmachine.com/sitemap.xml`
- `src/sitemap.njk` → `/sitemap.xml`: loop `collections.all`, skipping anything with `eleventyExcludeFromCollections` (the social-preview SVGs already are) and the 404 page, and output `<loc>` + `<lastmod>`.

**Decision:** Do you want to block any AI crawlers in `robots.txt` (GPTBot, CCBot, ClaudeBot and so on), or allow everything?

### F10. twitter:card and og:type
Add `<meta name="twitter:card" content="summary_large_image">` and `<meta property="og:type" content="{{ 'article' if tags else 'website' }}">` to `grid.njk`. Bluesky and Mastodon also read `twitter:card`.

### F11. apple-touch-icon
Needs a 180×180 PNG (the current `favicon.png` is 48×48). I'd generate one from `favicon.svg` and add `<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">`.

### F12. WebSub hub (optional)
Lets feed readers get new posts instantly instead of polling. It needs `<link rel="hub" href="https://pubsubhubbub.appspot.com/">` in `feed.njk` and `grid.njk`, plus a ping step in `deploy-and-toot.yml` after deploy. Low value for effort. I'd skip it unless you want it.

### F13. Microsub (skip)
Microsub is for reader apps you'd *use*, not something your site needs to publish. The report flags it, but I'd ignore it.

### F14. Homepage "Latest Posts" as h-feed (optional)
`blog-latest-post.njk` could be marked up as a small `h-feed` of `h-entry` cards, so parsers find posts on the homepage. That would turn the report's "Posts with an author" check green on the homepage once F1 is in. Low effort if F3/F7 are approved.

---

## Suggested order
1. F5, F1, F2, F4 – clears every warning in the report
2. F3 + CSS line, F6, F7, F8 – correct post markup sitewide
3. F9, F10, F11, F14 – tips
4. F12 only if wanted

After applying: run `npm run build`, check one post, a note, an update, the homepage and a category page in the browser, then re-run the indie checker and https://pin13.net/mf2/ against the live URLs.

## Open decisions
- F1: visible or hidden h-card? Which photo, if any?
- F3: filter `posts`/`notes` out of the `p-category` tags?
- F9: block AI crawlers in robots.txt?
- F12: WebSub, yes or no?
