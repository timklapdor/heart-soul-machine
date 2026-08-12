---
title: Tooting from the Blog
aliases:
  - Tooting from the Blog
categories:
  - "[[Blog]]"
status:
date: 2026-08-11
updatedDate:
updateDescription:
tags:
location:
coverImage:
summary: My approach to sharing via the fediverse has had to change with the closure of Echofeed. So here's my approach to replacing EchoFeed with a GitHub Action.
commentId: '117075800933811823'
url: https://heartsoulmachine.com/blog/2026/08-11-tooting-from-the-blog/
mastodonTags:
  - Blaugust
  - Echofeed
  - POSSE
---
I've been using [EchoFeed](https://echofeed.app/) to crosspost from my blog to Mastodon for a while now. It's a solid little tool, but I've been slack and have been relying on someone else's free hosted service to keep my POSSE workflow running. I'm a massive fan of Robb and have been so appreciative of this tool, which came along at exactly the right time for me. But someone's generosity often hides the amount of effort that goes into it, and [now it's been shuttered ](https://rknight.me/blog/shutting-down-echofeed/) I need to look for a new solution. Thanks Robb for all the work that you've put into this service and the value it's given my tiny little corner of the web. 

With the news, I decided I needed to replace what Echofeed provided - posting to Mastodon is literally the only promotion I do for the site- and rather than migrate to another third-party service, I wondered if I could just use my existing stack instead. The result is a GitHub Action that reads my blog's RSS feed, works out which posts haven't been shared yet, and toots the new ones to Mastodon. I've set it up to also post to Bluesky as well. It runs as part of your existing deployment pipeline, keeps its own state in a JSON file committed to the repo, and requires no server, database, or any other subscription.

> Note: This was vibe-coded with Claude. While I appreciate the craft that goes into coding, I am not blessed with that skill. I know my way around web systems well enough to know what's possible - I just can't make the magic happen. If this puts you off - that's fine. If it inspires you to write something yourself - let me know. I'd be more than happy to swap out the AI slop with something hand-crafted. 

## How it works

Three pieces:

- A **state file** (`data/posted-guids.json`) that records which feed items have already been posted, so nothing gets duplicated.
- A **script** that fetches the feed, compares it against that state file, and posts anything new to Mastodon's API.
- A **workflow** that runs the script, either on a schedule or as a step in your existing build and deploy pipeline.

On the very first run, it records everything currently in your feed as "already posted" without tooting any of it. That matters, otherwise your entire back catalogue lands on Mastodon in one go the moment you turn this on. From then on, only genuinely new items get posted.

## The script

This is Node, using `rss-parser` to handle the feed and the built-in `fetch` for talking to both platforms' APIs. Each post gets a fixed prefix and the title, the feed's `<summary>` (Mastodon only, see below), the link, and hashtags built from any `<category>` elements on the item. If the item has an enclosure or `<media:content>` image, it downloads that once and attaches it natively wherever it's needed, rather than just linking to it.

Mastodon and Bluesky post independently of each other. If one fails, the other still goes out, and only the failed one is retried on the next run.

You can [check out the script on GitHub](https://gist.github.com/timklapdor/54eeccd33dae2eeac307665872090f80). 

## Adding hashtags

Hashtags come from RSS's own `<category>` element, which `rss-parser` already collects into `item.categories` with no extra parsing needed. Add a field to a post's front matter:

```yaml
{% raw %}
---
title: All in the Verbs
date: 2026-04-10
mastodonTags: [ai, learningdesign]
---
{% endraw %}
```

Keeping it a separate field from whatever tags your site already uses for its own taxonomy or nav matters, since those often include values like `"posts"` or `"nav"` you wouldn't want turning into hashtags. Then in the feed template:

```liquid
{% raw %}
{% for post in collections.posts %}
  <item>
    <title>{{ post.data.title }}</title>
    <link>{{ post.url | url }}</link>
    <guid>{{ post.url | url }}</guid>
    <summary>{{ post.data.summary }}</summary>
    {% for tag in post.data.mastodonTags %}
    <category>{{ tag }}</category>
    {% endfor %}
  </item>
{% endfor %}
{% endraw %}
```

Since it's a plain loop over an optional array, posts without `mastodonTags` just emit zero `<category>` tags, no conditional needed. A post with `[ai, learningdesign]` in front matter comes out as `#Ai #LearningDesign` in the toot.

## The workflow

If you already build and deploy your site through a GitHub Actions workflow as I do, you can fold this in as a second job instead, gated with `needs:` so it only runs after a successful deploy:

```yaml
{% raw %}
toot:
  needs: deploy
  if: github.ref == 'refs/heads/main' && success()
  runs-on: ubuntu-22.04
  permissions:
    contents: write
  steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-node@v4
      with:
        node-version: "24"

    - name: Wait for Pages CDN to catch up
      run: sleep 60
      # The deploy job just pushed to gh-pages, but GitHub's CDN can take
      # a short while to actually serve the new content. Without this,
      # the feed fetch below can occasionally hit a stale cached version
      # of feed.xml, missing whatever changed in the most recent deploy.

    - name: Install dependencies
      run: npm install rss-parser

    - name: Check feed and post new items
      env:
        FEED_URL: ${{ vars.FEED_URL }}
        MASTODON_INSTANCE_URL: ${{ vars.MASTODON_INSTANCE_URL }}
        MASTODON_TOKEN: ${{ secrets.MASTODON_TOKEN }}
        BLUESKY_HANDLE: ${{ vars.BLUESKY_HANDLE }}
        BLUESKY_APP_PASSWORD: ${{ secrets.BLUESKY_APP_PASSWORD }}
      run: node scripts/toot-new-posts.mjs

    - name: Commit updated state file
      run: |
        git config user.name "github-actions[bot]"
        git config user.email "github-actions[bot]@users.noreply.github.com"
        git add data/posted-guids.json
        git diff --staged --quiet || git commit -m "Update posted-guids state [skip ci]"
        git push
{% endraw %}
```

If you want, you could run this  as a standalone version that polls every 30 minutes, independent of however your site actually gets built and deployed. That might be useful for you, but that doesn't suit the light touch workflow I have on my personal blog. 
## Setting it up

1. **Get a Mastodon access token.** Settings → Development → New Application on your instance, tick `write:statuses`, create it, copy the token.
2. **Add the two files** to your repo: `scripts/toot-new-posts.mjs` and an empty `data/posted-guids.json` containing just `[]`, both at the repo root, plus whichever workflow file fits your setup.
3. **Add repo secrets and variables** (Settings → Secrets and variables → Actions): secret `MASTODON_TOKEN`, and variables `FEED_URL` and `MASTODON_INSTANCE_URL`.
4. **Push, and check the Actions tab.** The first run should complete without posting anything, just seeding the state file with your existing posts.
5. **Publish something new** to confirm it actually toots.

If you want a different post format, hashtags, a different field from the feed, whatever, it's all in `buildStatusText()`. That's the only function you'd realistically need to touch.

## Adding Bluesky

Bluesky (AT Protocol) is a different enough API that it's worth knowing the gaps before turning it on:

- **Auth is a handle + app password**, not a static token. Generate one in Bluesky's Settings → App Passwords (not your main login password), and the script exchanges it for a short-lived session at the start of each run.
- **300 characters, not ~500.** There isn't room for title, link, hashtags, _and_ a summary, so the Bluesky post drops the summary entirely and just sends the prefix, title, link, and hashtags. If the title alone is long, it's truncated with an ellipsis so the link and hashtags always survive intact.
- **Links and hashtags need "facets."** Unlike Mastodon, having a URL or `#tag` in the text doesn't make it clickable or searchable, AT Protocol needs an explicit byte-range annotation pointing at each one.
- **Images upload through a different endpoint** (a blob upload, not a multipart form), producing a blob reference rather than a media ID.

It's genuinely optional. Without both `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` set, Bluesky posting is skipped entirely and Mastodon behaves exactly as before. Turn it on later and it gets its own silent first-run seed, same as Mastodon did, so it won't try to post your whole archive the moment it's switched on. State entries are tracked per platform (`mastodon:<id>`, `bluesky:<id>`), so a failure on one never causes a duplicate or a skip on the other.

## One gotcha: give your feed items a stable guid

The script tells "already posted" from "new" using each item's `guid`, falling back to its `link` if the feed doesn't set one:

```js
function itemId(item) {
  return item.guid || item.id || item.link;
}
```

If your feed template doesn't set an explicit `<guid>`, most static site generators fall back to using the post's URL as the guid too, which is fine right up until that URL changes. Fix a typo in a slug, correct a post's date, move it between folders, and the URL changes, which means the script sees a "new" item it's never encountered before and toots it again, even though nothing about the content actually changed. I hit exactly this: correcting a post's date shifted its permalink by one day, and the next deploy dutifully re-tooted it as if it were brand new.

Nothing breaks when this happens, you just get a duplicate toot linking to the same post under its corrected URL. Harmless, but avoidable. 
## Would this work on Codeberg?

Mostly, with caveats. Codeberg (running Forgejo) has two CI options: Woodpecker CI, which is the more established, production-ready offering, and Forgejo Actions, which is closer to GitHub Actions in syntax but still in public alpha there and comes with tighter resource and time limits on hosted runs. Forgejo Actions supports scheduled triggers via cron, same as GitHub, so the shape of this workflow translates.

The friction is in the actions themselves. `actions/checkout` and `actions/setup-node` aren't guaranteed to exist as-is; Forgejo mirrors some GitHub Actions under its own namespace, but not the whole marketplace, and compatibility isn't guaranteed. You'd likely swap those for Forgejo-native equivalents or a plain shell script that does the checkout and Node setup manually. The script itself doesn't care where it runs, since it's just Node hitting two HTTP APIs, so the actual logic ports over unchanged. The wrapper around it is what would need adjusting.

If your instinct is host-your-own generally, this would also run fine as a plain cron job on any server with Node installed, GitHub Actions isn't a requirement, just a convenient place to run it for free without maintaining a server yourself.
