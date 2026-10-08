# Heart Soul Machine → Pattern Starter: audit and migration path

**Status:** Draft for discussion, no code changed
**Date:** 6 October 2026
**Compared:** `heart-soul-machine` @ `2bb5db2` (main) and `pattern-starter` @ `6b3ceb9` (main), plus the starter's open feature branches (`feature/inline-svg`, `feature/highlight-marks`, `feature/headline-block`, `feature/section-nav-order`)

---

## 1. The short version

- **The two codebases already share a lot of DNA.** HSM's `_palette.scss` carries the same seven landscape OKLCH scales and role-token names as the starter's `_palette.css` + `_tokens.css`. HSM's article grid (`1vw 1fr 1fr minmax(30ch, 75ch) 1fr 1fr 1vw`) is the unnamed ancestor of the starter's `full / popout / content` breakout grid. HSM's fluid type formula is identical. HSM's left sidebar is the starter's `headerLayout: "vertical"`. Consolidation is mostly re-shaping, not redesign.
- **The real gap is conventions, not visuals.** HSM uses Sass, class-heavy selectors, CommonJS config, inline `<script>` blocks and CDN libraries. The starter uses plain CSS, semantic-first selectors with `data-*`/`aria-*` hooks, ESM config and deferred vanilla JS. Every component below needs to cross that gap.
- **HSM has 16 components or features the starter doesn't.** The three you named (glitch, timeline, comments) each carry bugs or accessibility problems worth fixing during the move, not after.
- **About ten HSM features belong back in the starter**, starting with the RSS feed (the starter's header and footer already link to a `/feed.xml` that doesn't exist).
- **Recommended approach: "shape in place, then lift".** Rebuild each component inside HSM in the starter's shape while HSM keeps running its current pipeline. Swap the page shell and the build pipeline last. The live site keeps working at every step.

---

## 2. Convention gap

| Area | Heart Soul Machine | Pattern Starter | Migration rule |
|---|---|---|---|
| Config | CommonJS `.eleventy.js`, 224 lines, everything in one file | ESM `eleventy.config.js` | Move to ESM at pipeline cutover (Stage 5). Group filters/shortcodes per component so they can travel with it. |
| CSS language | Sass (`@use`, `$vars`, Sass functions) via `eleventy-plugin-sass-lightningcss` | Plain CSS, native nesting, `@import`, via `eleventy-plugin-lightningcss` | Rewrite each module in plain-CSS syntax. Converted modules keep loading through the existing Sass pipeline until every module is converted (see Stage 1 for the one thing to test). |
| Selectors | Class-heavy (`div.timeline`, `ul.metadata`, `.hero-overlay`) | Semantic first, classes only as modifiers, state on `data-*`/`aria-*` | Each component gets one root hook (class or `data-component`), internals styled semantically. |
| Colour | Mixed: OKLCH tokens + Flexoki hex vars + `--heart`/`--soul` + P10 HSL palette + `color-mix` | OKLCH palette → semantic/role tokens, every token a `light-dark()` pair | Tokens only. Legacy vars go through a temporary alias layer, then get deleted. |
| JS | Inline scripts, CDN deps (dynamics.js, tinycolor), `onclick` attributes | Files in `assets/js/`, `defer`, no deps, attribute-driven | Same as starter. One file per behaviour, binds itself to a data attribute, does nothing if the element isn't on the page. |
| Partials | `partials/` used as both layouts and fragments (`post.njk` is a layout with front matter) | `layouts/` for page shells, `partials/` for shell pieces, `components/` for reusable blocks | Adopt the three-folder split. |
| Markdown authoring | `{.class}` attrs, bracketed spans, footnotes, `breaks: true`, raw HTML | `:::container` fences and `{% shortcode %}` | Prefer containers/shortcodes for new components. Keep attrs/footnotes/spans as HSM config (attrs is already on the starter's `feature/highlight-marks` branch). |
| Images | Passthrough copies, no resizing | `eleventy-img` transform, `<picture>`, figure captions | Adopt the starter's. Check `{.img-left}` and the `p img` box-shadow styling survive. |
| Theme | `data-theme` CSS exists, no switcher UI | System/Light/Dark switcher + no-flash script | Free win once HSM uses the starter shell. |
| Output | `docs/` (GitHub Action publishes this) | `_site/` | Keep `docs/` as an HSM override. Changing it means changing the deploy workflow for no gain. |

---

## 3. Problems found during the audit

Fix the cheap ones in Stage 0. The rest get fixed as part of their component's migration.

| # | Where | Problem | Impact |
|---|---|---|---|
| P1 | `assets/js/glitch.js`, `layouts/grid.njk` | Idle glitch loops forever every 4–12 s with no `prefers-reduced-motion` check and no pause control. | Accessibility: motion sensitivity, and auto-moving content with no way to stop it (WCAG 2.2.2). |
| P2 | `glitch.js` | Clones are full copies of the element appended to `<body>`, including text and IDs (`#header-logo`, every SVG `id`). No `aria-hidden`. | Duplicate IDs; screen readers can hit duplicated nav text mid-burst. |
| P3 | `grid.njk` | Glitch depends on dynamics.js 1.1.5 (unmaintained since 2016) and tinycolor from a CDN, loaded blocking at the end of `<body>`. | Third-party dependency for a decorative effect; breaks if the CDN does. |
| P4 | `partials/header.njk` | Inline logo SVG starts with an `<?xml ?>` declaration and carries a `<style>` block with global `.cls-1/2/3` classes. | Invalid in HTML; class names leak site-wide. |
| P5 | `_data/timeline.json` | Rendered in file order, and the file isn't sorted (a 2017 entry sits between 1989 and 1998). | Timeline shows events out of order. |
| P6 | `timeline.md` | Event type shown only as an icon, no text alternative. Four-column grid has no narrow-screen layout. | Type invisible to screen readers; cramped on phones. |
| P7 | `partials/comments.njk` | `<noscript>` link uses `site.comments.*` and `page.comments.id`, none of which exist. | No-JS fallback link is broken on every post. |
| P8 | `comments.njk` | `instance` is always `""` (empty badge rendered), `verified` is never `true`, no error or loading state, `innerHTML +=` inside the loop. | Dead UI, silent failures, re-parses the list per comment. |
| P9 | `comments.njk` | Fetches from mastodon.social on every post page load, before the reader asks. | Third-party request (privacy) and API load on every view. |
| P10 | Comments config | Host/username defined twice: `_data/siteSettings.json` and `blog/blog.json`. | Two sources of truth. |
| P11 | `_main.scss` vs `_comments.scss` | `main article .comment` (a marginal-note style: `margin-left: 20ch`, Hyams background) also matches every Mastodon comment `<article class="comment">`. | Unintended style collision, hard to reason about. |
| P12 | `_comments.scss` | References `--secondary-accent-color` and `--p10-5-juicyt` (typo); neither exists. | Verified styling can't render. |
| P13 | `partials/presentation.njk` | `{{ 'coverImage' \| url }}` passes the literal string, not the variable. | Presentation cover images never show. |
| P14 | `_tables.scss` | `td { color: var(--color-base-900) }` regardless of theme. | Dark text on dark backgrounds in dark mode. |
| P15 | `.eleventy.js` | Interlinker's `defaultLayout: 'layouts/embed.liquid'` points at a file that doesn't exist; the plugin also relies on a local patch inside `node_modules`. | Embeds fail; the patch disappears on a clean install. |
| P16 | Dead code | `_svg-factory.scss` (nothing uses its variables), `_layout.scss` (fully commented out), `partials/hero.njk` (empty), `markdown-it-wikilinks` and `markdown-it-eleventy-img` (installed, not loaded). | Noise that slows the audit of what's real. |
| P17 | Markup duplication | The metadata bar is hand-written four times (post, note, presentation, update) with drifting differences. Tag-joining logic is copy-pasted. | Every fix needs four edits. |
| P18 | `.eleventy.js` | Nine date filters doing overlapping jobs (`postDate`, `simpleDate`, `readableDate`, `monthDate`…). | Hard to know which to use. |

---

## 4. Component catalogue

Each card covers what exists now, where it should end up, how it degrades without JS, and whether it should go back into the starter.

**Target shape for every component** (see §7 for the full checklist):

- `src/_includes/components/<name>.njk`: a Nunjucks **macro** with explicit parameters, not an `include` that silently reads page globals. Macros make the inputs visible, which is what makes the component portable.
- `src/css/modules/_<name>.css`: plain CSS, tokens only, scoped to one root hook.
- `src/assets/js/<name>.js` (only if needed): deferred, binds to a `data-*` attribute, no-ops when absent.
- Optional `_data/<name>.json` for configuration, and a section on the starter's `/styles/` page as the living demo.

**Rollback flag key:** 🟢 strong candidate for the starter · 🟡 worth it, needs generalising · ⚪ keep HSM-only

---

### 4.1 Glitch effect 🟡

**Now:** `assets/js/glitch.js` (277 lines, UMD module), set up in an inline script in `grid.njk`: idle + hover on `#header-logo`, a lighter hover on nav links. Needs a hidden `<svg id="clip-paths">` in the layout and two CDN libraries. Technique: clone the element N times, clip each clone to random horizontal stripes via SVG `clipPath`, recolour with random hues, jitter sideways, remove.

**Problems:** P1, P2, P3, P4. Random HSL colours ignore the palette and dark mode.

**Target shape:**

- **Authoring hook, not a partial.** Any element opts in with a data attribute, e.g. `data-glitch="idle hover"` or `data-glitch="hover"` with optional `data-glitch-strength="subtle"`. This matches the starter's "state and behaviour live on attributes" rule and removes the inline setup script.
- **JS:** `assets/js/glitch.js`, rewritten dependency-free. The Web Animations API replaces dynamics.js; CSS `clip-path: inset()`/`polygon()` on each clone replaces the SVG `clipPath` container (so the layout no longer needs `#clip-paths`); colours come from the palette's "juicy" tokens instead of tinycolor.
- **Clones:** strip IDs, add `aria-hidden="true"` and `inert`.
- **Motion:** under `prefers-reduced-motion: reduce`, no idle loop and no hover burst. Pause the idle loop when the tab is hidden. Decide on an idle limit (see §8).
- **Loading:** opt-in per site via a `site.json` flag (e.g. `effects.glitch`) that adds the script to the shell, or per page via the starter's existing `extraJs` front matter.
- **Logo:** inline the logo with the starter's `inlineSvg` shortcode (`feature/inline-svg` branch). Move the logo's colours from its embedded `<style>` to CSS custom properties so the glitch can recolour paths through tokens.

**Without JS:** nothing changes; the logo and nav render normally.

**Starter fit:** a new opt-in "effects" module, off by default. Your "A little glitch" post says the idea came from portfolio work, so the portfolio and Pattern Learning sites are likely consumers. Brand-neutral once colours come from tokens.

**Stage:** 3c

---

### 4.2 Timeline 🟢

**Now:** `timeline.md` loops `_data/timeline.json` (59 events: Life, Work, School, Project) with inline markup. A chain of four `{{ 'work' if … }}` expressions builds the class, and four `{% if %}` blocks pick the icon. Description runs through the `markdown` filter. Styles in `_timeline.scss` (4-column grid, `--soul` divider).

**Problems:** P5, P6. Markup lives in a content page, so it can't be reused.

**Target shape:**

- **Data:** keep `_data/timeline.json` and normalise it: lowercase `type`, ISO `date`. Sort in the component (a small `sortByDate` filter), never trust file order.
- **Type config:** `_data/timelineTypes.json` mapping each type to label, icon and colour token. Adding a type then means editing data, not templates. The same component can serve a Pattern Learning history page (the starter already has `patterns/_history.md`).
- **Partial:** `components/timeline.njk`, macro `timeline(items, types, options)`. Semantic markup: `<ol>`, each `<li data-type="work">`, `<time datetime="…">`, icon `aria-hidden` plus a visually hidden type label. Optional year grouping.
- **CSS:** `_timeline.css`, colours keyed off `[data-type]`. This mirrors how the starter's `_pattern-grid.css` keys off Learning Type, so it reads as one system. Collapses to a stacked layout on narrow screens (container query, so it works in any column width).
- **Optional JS:** filter by type, reusing the approach in the starter's `pattern-filter.js`. Without JS, all events show.
- **Page:** `timeline.md` shrinks to front matter, intro copy and one macro call.

**Starter fit:** strong. Generic, data-driven, no brand assumptions. Your portfolio project also has a timeline visualisation, so it's worth agreeing one data shape across all three sites.

**Stage:** 3a

---

### 4.3 Responses: Mastodon comments + webmentions 🟢

**Now:** two separate partials both included by `post.njk`:

- `comments.njk` (167 lines, mostly inline JS): fetches the Mastodon status and its replies client-side, builds DOM node by node, sanitises with a local `purify.min.js`. Styles in `_comments.scss` and `_avatars.scss`.
- `webmentions.njk`: build-time likes, reposts and replies from webmention.io via `_data/webmentions.js` and the `webmentionsByUrl` filter.

**Problems:** P7–P12. Heading levels (`h4` Comments, `h5` author) don't follow the article outline. If Bridgy forwards Mastodon replies as webmentions, the same reply can appear in both lists. Worth checking.

**Target shape:**

- **One wrapper:** `components/responses.njk`, macro `responses(url, comments)`, rendering one "Responses" section that contains webmention facepiles/replies and the Mastodon thread. Both pieces are separate macros (`webmentions.njk`, `mastodon-comments.njk`) so a site can use either.
- **Config:** one source, `site.json → comments: { host, username }`. Per post, keep the existing `commentId` front matter key (80 blog posts already use it; at least one has it empty, so the component must treat empty as "off").
- **Markup lives in Nunjucks, not JS strings.** The partial ships a `<template>` for one comment; the JS clones and fills it. Restyling or restructuring a comment then never touches JS.
- **JS:** `assets/js/mastodon-comments.js`, reads `data-host` / `data-status-id` from the section. Loading and error states, an `aria-live="polite"` region for the result, and a single DOM write at the end.
- **CSS:** `_responses.css` (absorbs `_comments.scss` + `_avatars.scss`), tokens only, scoped under the section's root hook so it can't collide with anything else (fixes P11).
- **Loading strategy:** see §8. Recommended: click-to-load ("Show replies from Mastodon"), which fixes P9.
- **Later option:** fetch Mastodon replies at build time with `eleventy-fetch` (the way webmentions already work) for a static, no-JS list, with the JS only refreshing it. Good long-term shape, not needed for the first pass.

**Without JS:** the section shows build-time webmentions and a working "Reply on Mastodon" link (fixes P7).

**Starter fit:** strong. Any IndieWeb-leaning site built on the starter wants this. Off by default; turns on when `site.comments` / a webmention token exists.

**Stage:** 3b

---

### 4.4 Entry metadata bar + icon set 🟢

**Now:** `ul.metadata` hand-built in `post.njk`, `note.njk`, `presentation.njk` and `update.njk` (P17): date, categories, reading time, author, location, tags, updated date. h-entry microformat classes (`dt-published`, `p-category`, `p-author`, `p-locality`). Icons from `_includes/icons/*.svg` (14 Tabler icons). A second, dead icon system lives in `_svg-factory.scss` (P16).

**Target shape:**

- `components/entry-meta.njk`, macro `entryMeta(fields, options)` where `fields` is an ordered list (`["date", "categories", "readingTime"]`) so each layout picks what to show and in what order.
- One `joinList` filter for "a, b & c" (replaces three copies of the loop).
- One `date` filter with named formats (replaces the nine in P18).
- Icons become `{% icon "calendar" %}`, a shortcode that inlines from `_includes/icons/` with `aria-hidden="true"`. Same mechanism as the starter's `inlineSvg`, so consider making `icon` a thin wrapper around it.
- Microformat classes stay. They're how webmentions and Micropub clients read the page.

**Starter fit:** strong. Any blog-shaped site needs it, and the starter has no post template yet.

**Stage:** 2

---

### 4.5 Cover image hero 🟡

**Now:** `post.njk` renders `img.header-image` + `div.hero-overlay` + `h1.hero` stacked in grid row 1 when `coverImage` is set. CSS in `_main.scss`.

**Target shape:** `components/entry-header.njk` (title + optional cover + overlay), placing the image on the starter's currently unused `full` tier. The overlay becomes a pseudo-element, not an empty div. Cover image goes through the image transform.

**Starter fit:** good. The starter README calls `full` "a spare tier for a future full-bleed hero image", and this is that.

**Stage:** 2

---

### 4.6 Lede (summary/introduction) 🟢

**Now:** `.p-summary.introduction` in five templates: large Aleo Black, dotted right/bottom border. A near-copy `.summary` in `_presentation.scss`.

**Target shape:** `components/lede.njk` (or just a semantic rule on a `<p class="lede">` emitted by layouts). Typeface through a new `--font-display` role alongside the starter's `--font-heading/nav/body/mono`. Aleo stays HSM's value for that role.

**Starter fit:** strong. Small, generic, and gives the starter a display-font role it currently lacks.

**Stage:** 2

---

### 4.7 Quote variants 🟢

**Now:** `blockquote{.important}` (full-colour block, 2rem, `--dark-heart` background) and `blockquote{.pullquote}` (centred, dashed border). One use each in content.

**Target shape:** `:::pullquote` and `:::callout` container fences, matching the starter's `:::alert-*` / `:::headline` pattern. Colours from role tokens. Keep `{.important}` / `{.pullquote}` working via attrs during transition, then update the two posts.

**Starter fit:** strong. Sits naturally next to `:::headline`.

**Stage:** 2

---

### 4.8 Responsive embeds 🟢

**Now:** `.responsive-iframe-container` (padding-top 56.25% hack) and `.facebook` (9:16 portrait). Most YouTube embeds are raw `<iframe>`s pasted into posts, plus `eleventy-plugin-youtube-embed`.

**Target shape:** `{% embed url, "16/9" %}` shortcode outputting an `iframe` with native `aspect-ratio` and `loading="lazy"`, CSS in `_embed.css`, placed on the `popout` tier. Keep the YouTube plugin for bare-URL embeds. Raw iframes keep working, so no content rewrite is required.

**Starter fit:** strong.

**Stage:** 2

---

### 4.9 Latest posts cards ⚪ (maps onto existing starter component)

**Now:** `blog-latest-post.njk`: two cards with whole-card click via `a::after`, inline in `index.md`.

**Target shape:** none new. Render through the starter's `content-cards` styles (same whole-card-click technique) from a `latestPosts(collection, count)` macro.

**Stage:** 2

---

### 4.10 Year archive + category chips 🟡

**Now:** `blog-archive.njk` + `postsByYear` collection; `span.category` chips; `category-archive.njk` still on the legacy `layouts/base.njk`; tag pages via `tags-list.md`.

**Target shape:** `components/archive-by-year.njk` macro taking any collection; chips use the starter's `.label` modifier instead of a new class; category/tag pages move onto the shared layout, and `layouts/base.njk` is retired.

**Starter fit:** good, as part of a "blog pack" (see §5).

**Stage:** 2

---

### 4.11 Digital garden: note types + backlinks ⚪

**Now:** notes carry `type: seed | budding | evergreen` with icons; `note-archive.njk` lists them; "Links to this note" comes from the interlinker plugin; `_data/processObsidianTags.js` turns nested Obsidian tags into categories.

**Problems:** P15.

**Target shape:** `components/note-status.njk` (icon + label, driven by a small types data file like the timeline) and `components/backlinks.njk`. Keep interlinker HSM-only until the `node_modules` patch is upstreamed or replaced.

**Starter fit:** only if Pattern Learning content gets authored in Obsidian. Flagged as a question, not a recommendation.

**Stage:** 2

---

### 4.12 Updates stream, photo grid, syndication links ⚪ / 🟡

**Now:** `update.njk`, `update-photos.njk`, `updates-feed.njk`, `_updates.scss`. Photo grid switches columns by count via `update-photos--1…4` modifier classes. "Also on Mastodon and Bluesky" links from `_data/syndication.json`.

**Target shape:**

- Photo grid: express the count as `data-count="3"` (attribute, not four classes), or fold it into the starter's `gallery` component as a "fixed grid" variant. The starter's lightbox would then work on update photos for free.
- `components/syndication-links.njk`: generic "Also on…" list from a `{ service: url }` map.
- Micropub, the JSON feed and the stream page stay HSM-only.

**Starter fit:** photo grid 🟡 (as a gallery variant), syndication links 🟡, the rest ⚪.

**Stage:** 2 (photo grid, syndication links)

---

### 4.13 Presentation layout 🟡

**Now:** `presentation.njk` + `_presentation.scss`: each `<section>` in the markdown becomes a 7-column row, slide image left, notes right, stacking under 800px. Hand-written `<section>` tags in content.

**Problems:** P13.

**Target shape:** a `:::slide` container fence (no raw `<section>` in markdown), a `layouts/presentation.njk` that uses `entry-meta` and `lede`, CSS in `_slides.css` on the `popout` tier.

**Starter fit:** good. You present regularly, and Pattern Learning talks would use the same format.

**Stage:** 2

---

### 4.14 Tables and colour helpers ⚪ (already in starter)

**Now:** `table.blooms-3d` and `table.blooms-verbs` in `_tables.scss`, plus seven `.p10-N-bg` classes (one post, `2024-11-OEGlobal-Presentation.md`) backed by a 92-line P10 palette.

**Target shape:** none new. The starter already has `.blooms-domains` / `.blooms-verbs` built on Bloom's 3D domain tokens. Point the two HSM tables at the starter classes; remap the P10 cells onto landscape scales and delete `_p10-colours.scss`. Fixes P14 on the way.

**Stage:** 1

---

### 4.15 Site shell ⚪ / 🟢

**Now:** `layouts/grid.njk` (147 lines) carries the head, IndieWeb links, Micropub/IndieAuth links, Matomo, sidebar, animated SVG hamburger (`ham7`) driven by both an `onclick` attribute and `nav.js`, RSS icon, glitch setup. `layouts/base.njk` is a legacy shell still used by `category-archive.njk`. `partials/navigation.njk` is used only by that legacy shell.

**Target shape:** the starter's `base.njk` + `head.njk` + `header.njk` + `footer.njk` with `site.headerLayout: "vertical"`. HSM-specific head content goes into **named extension points** rather than edits to the starter files:

- `site.json → indieweb: { relMe: [...], webmention, pingback, micropub: {...} }` rendered by a `partials/head-indieweb.njk` 🟢
- `site.json → analytics: { provider: "matomo", url, siteId }` rendered by `partials/head-analytics.njk` 🟢 (respects Do Not Track, no cookies, as now)
- `site.json → feeds: [...]` for `<link rel="alternate">` 🟢
- Logo via `site.logo` + `inlineSvg`; the animated hamburger becomes an optional brand variant of the starter's CSS hamburger, or is dropped (§8).

You gain the theme switcher, skip link and `aria-current` nav without building them.

**Stage:** 4

---

### 4.16 Build-time features 🟢

| Feature | Where in HSM | Starter fit |
|---|---|---|
| Atom feed (`type="html"` content, media thumbnail) | `src/feed.njk`, `@11ty/eleventy-plugin-rss` | 🟢 **Highest priority.** The starter links to `/feed.xml` from its header/footer but has no feed. Carry the `type="html"` lesson (see `feed_xhtml_escaping_fix` note) with it. |
| Social preview images (SVG template → JPEG after build) | `social-previews-*.njk`, `afterBuild` hook, `splitlines` filter | 🟢 The starter's `site.image` is a placeholder with no file. Generalise colours/fonts to tokens and site name. |
| Pagefind search | `eleventy.after` hook, `partials/search.njk`, `_search.scss` | 🟢 Make it an opt-in flag. |
| Reading time | `eleventy-plugin-time-to-read` | 🟢 Part of `entry-meta`. |
| Date filters | 9 filters in `.eleventy.js` | 🟢 One `date` filter with named formats and a site timezone (`Australia/Adelaide`). |
| Wikilinks/backlinks/Obsidian tags | interlinker + `processObsidianTags.js` | ⚪ for now (P15). |
| JSON feed, Micropub, syndication state | `updates-feed-json.njk`, `micropub/`, `syndication.json` | ⚪ HSM-only. |

---

## 5. Features to roll back into the Starter

In suggested order. Each lands in the starter only after it's proven in HSM, through a feature branch with neutral demo content. (The starter's history shows two "revert brand-specific content committed straight to main" commits, so this rule is earning its keep.)

1. **Atom feed**: fixes a dead link the starter ships today.
2. **Entry metadata + icon shortcode + date filter**: the starter has no post template at all.
3. **Lede, pullquote/callout, embed**: small, generic, fill obvious gaps next to `headline` and `alert`.
4. **Timeline**: generic, data-driven, a Pattern Learning history page is a ready consumer.
5. **Responses (webmentions + Mastodon comments)**: off by default.
6. **Head extension points** (IndieWeb, analytics, feeds): config-driven, nothing renders unless set.
7. **Social preview generation**: replaces the `site.image` placeholder.
8. **Pagefind search**: opt-in.
9. **Glitch effect**: opt-in effects module.
10. **Presentation/slides layout**, **year archive**, **gallery fixed-grid variant**, **syndication links**: as a "blog pack".

**Structural flag for the starter itself:** it currently mixes a brand-neutral core (palette, tokens, type, layout, components) with Pattern Learning domain modules (`_pattern-grid.css`, `_type-grid.css`, Learning Type and Bloom's tokens, `patterns/`, `types/`). If HSM is going to be built on the starter, HSM would inherit all of that. Worth splitting the starter into **core** plus optional **packs** (Pattern Learning pack, blog pack, IndieWeb pack) before Stage 6. The `blooms-*` tables are the one case where HSM uses the domain pack today.

---

## 6. Staged migration path

Each stage ships on its own, keeps the live site working, and can be reverted on its own. Work on a branch per stage (or per component inside Stage 2/3), merge to `main` when its exit check passes.

### Stage 0: Baseline and clear-out (no visible change)

**Goal:** know what "unchanged" looks like, and remove noise.

- Save a baseline build of `docs/` and pick ~12 reference pages: home, a post with cover image + comments, a post with tables, a note, the notes index, an update, the updates stream, timeline, a presentation, search, a category page, 404.
- List URLs and outputs that must never change: post/note/update permalinks, `feed.xml`, `updates/feed.json`, `assets/social-previews/*.jpeg`, `/pagefind/`, the `rel="me"`, webmention and Micropub `<link>` tags. The cross-poster and Micropub endpoint depend on these.
- Delete dead code (P16).
- Fix the one-liners: P5 (sort timeline), P7 (noscript link), P13 (presentation cover image).

**Exit check:** build diff against baseline shows only the intended fixes.

### Stage 1: Token and CSS foundation

**Goal:** HSM's CSS speaks the starter's token language, still compiled by Sass.

- Split `_palette.scss` into `_palette` and `_tokens` that mirror the starter files one-to-one. HSM's brand differences (accent hue 84 vs the starter's 238, primary/secondary values) move to a small `_brand` file of hue/chroma overrides, nothing else.
- Add a temporary `_legacy-aliases` module mapping `--heart`, `--soul`, `--dark-heart`, `--flexoki-*` onto tokens. Every later stage removes references; the count of remaining references is your progress meter. Delete the file at zero.
- Retire P10 colours and point tables at the starter's `blooms-*` classes (4.14).
- Adopt the starter's `_type.css` font roles; add `--font-display` for Aleo.
- Convert modules to plain-CSS syntax as `.css` files still loaded by `style.scss` via `@use`. Start with the simple ones: `_reset`, `_font-size`, `_fonts`, `_tables`, `_search`, `_iframe`. Test this with one module first: if Dart Sass rejects native nesting inside a `.css` file, keep the `.scss` extension but write only plain-CSS syntax, and rename at Stage 5.

**Exit check:** reference pages look identical in light and dark mode.

### Stage 2: Low-risk content components

**Goal:** collapse the duplicated templates into components, one PR each.

Order: `entry-meta` + `icon` + `date`/`joinList` filters (4.4) → `lede` (4.6) → `entry-header` (4.5) → quote containers (4.7) → `embed` (4.8) → latest posts via content-cards (4.9) → `archive-by-year` (4.10) → note status + backlinks (4.11) → update photo grid + syndication links (4.12) → slides (4.13).

Rule for each: the old partial calls the new macro first (same output), then the old partial disappears once nothing references it.

**Exit check per component:** reference pages match baseline except intended fixes; the component has its §7 checklist ticked.

### Stage 3: The three named components

Ordered by risk: build-time-only and one page, then 80 pages with JS, then every page.

- **3a Timeline** (4.2). One page, no JS required.
- **3b Responses** (4.3). Ship the static parts first (webmentions + working fallback link), then the click-to-load Mastodon thread.
- **3c Glitch** (4.1). Ship behind the `data-glitch` attribute on the existing header so it doesn't wait for Stage 4. Remove the CDN scripts and `#clip-paths` in the same PR.

**Exit check:** reduced-motion on = no motion; JS off = everything readable and linked; no third-party requests on post load.

### Stage 4: Shell convergence

**Goal:** HSM pages render through the starter's shell.

- Bring over the starter's `base.njk`, `head.njk`, `header.njk`, `footer.njk`, `_layout.css`, `_navigation.css`, `theme.js`, `nav-toggle.js` unmodified.
- Add the head extension partials (4.15). Set `headerLayout: "vertical"`.
- Switch layouts one at a time: pages → notes → posts → updates → presentations. `grid.njk` and legacy `base.njk` are deleted when nothing uses them.
- Re-check the Micropub/IndieAuth `<link>` tags and `rel="me"` on the live site straight after deploy (posting from iA Writer is the real test).

**Exit check:** reference pages match baseline layout; theme switcher, skip link and `aria-current` work; a test update posts and cross-posts.

### Stage 5: Pipeline cutover

**Goal:** HSM builds the way the starter builds.

- `.eleventy.js` → ESM `eleventy.config.js`, organised so each component's filters/shortcodes sit together.
- Swap `eleventy-plugin-sass-lightningcss` for `eleventy-plugin-lightningcss` once every module is `.css`; `style.scss` becomes `main.css` with native `@import`.
- Add the image transform + figure plugin. Watch the `p img` styling and `{.img-left}`, and the update images (Micropub commits them; the transform must not change their public URLs, which the cross-poster and JSON feed reference).
- Keep HSM's markdown-it options as HSM config: `breaks: true` changes how every existing post renders, so it stays even though the starter doesn't use it. Same for footnotes, bracketed spans, link attributes.
- Keep `docs/` output and the Pagefind / social-preview hooks.

**Exit check:** full build diff against baseline; feed validates (manually, in the browser); CI deploy + toot job succeed.

### Stage 6: HSM becomes a starter instance

**Goal:** one design system, two sites, upstream fixes flow down.

- Add the starter as an `upstream` git remote. HSM-specific files live in clearly separate paths (`_brand.css`, `site.json`, content, `micropub/`, HSM-only components) so starter merges stay clean.
- Upstream the §5 components to the starter, in that order, each via a feature branch.
- Requires the core/packs split in §5 first, or HSM inherits the Pattern Learning modules.

---

## 7. Component checklist ("done" means all of these)

- [ ] Macro in `_includes/components/`, explicit parameters, documented at the top of the file. No reliance on page globals beyond what the signature names.
- [ ] CSS module `_<name>.css`: plain CSS, tokens only (no hex, no legacy aliases), works in light and dark, scoped to one root hook, base styling semantic.
- [ ] JS (if any) in `assets/js/<name>.js`: deferred, binds to a `data-*` attribute, no-ops when absent, no third-party dependencies.
- [ ] Works with JS off. Respects `prefers-reduced-motion`.
- [ ] Accessible: real headings in outline order, text alternatives for icons, focus visible, live regions for anything that loads.
- [ ] Microformats preserved where the component touches an h-entry.
- [ ] Demo section on `/styles/`.
- [ ] README section in the starter's style (what, how to author, gotchas).
- [ ] Reference pages match baseline except intended changes.

---

## 8. Decisions for you

1. **Direction of travel.** Recommended: HSM becomes a starter instance (Stage 6). The alternative, folding starter pieces into HSM and leaving the starter separate, is less work now but means maintaining two design systems.
2. **Split the starter into core + packs before Stage 6?** Recommended yes (§5).
3. **Mastodon comments loading:** click-to-load (recommended: no third-party request until asked), auto-load when scrolled into view, or build-time only.
4. **Glitch idle animation:** keep the idle loop (with reduced-motion off and tab-hidden pause), limit it to the home page, cap it to a few bursts per visit, or hover-only.
5. **Hamburger:** adopt the starter's CSS hamburger, or keep HSM's animated SVG as a brand variant of it.
6. **Obsidian tooling** (wikilinks, backlinks, nested tags): keep HSM-only, or plan a starter "garden pack" if Pattern Learning content will be authored in Obsidian.
7. **Timeline data:** agree one shape across HSM, the portfolio and a Pattern Learning history page before building 3a.
