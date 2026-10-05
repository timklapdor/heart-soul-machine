---
title: Small Updates
aliases:
  - Small Updates
categories:
  - "[[Blog]]"
status:
date: 2026-10-05
updatedDate:
updateDescription:
tags:
location:
coverImage:
summary: A new space on the site for short posts and photos – written here first, then shared to Mastodon and Bluesky.
commentId:
url: https://heartsoulmachine.com/blog/2026/10-05-small-updates/
mastodonTags:
  - IndieWeb
  - POSSE
  - Micropub
---
There's a gap in how I use this site. Blog posts and notes live here, but the small stuff – a photo from a walk, a link worth sharing, a passing thought – has always gone straight to Mastodon or Bluesky. That means a lot of my day-to-day lives on someone else's platform, which sits awkwardly with the whole reason this site exists.

So I've added a new section: [Updates](/updates/). They're short posts with up to four photos and no titles. They're published here first and then shared to Mastodon and Bluesky as proper posts – the full text, the photos and their alt text – rather than as a link back to the site. Each update then links out to its copies, so there's a trail from the original to wherever the conversation happens. It's [[POSSE]] for the small stuff.
## How it works

The tricky part with a static site is that there's nothing to post *to*. This site is built with 11ty and hosted on GitHub Pages – no server, no database, no admin screen. The answer turned out to be [Micropub](https://indieweb.org/Micropub), an open standard that lets writing apps publish to your own site. I had heard of it before, but [this post from Andrew Canion](https://canion.pika.page/posts/2026-10-04-outpost-by-jim-mitchell) led me to look into it more. 

I already had a [Reclaim Hosting](https://www.reclaimhosting.com/) account, so the Micropub endpoint is a single PHP file on that server. When I publish, it checks it's me, takes the text and photos, and commits them to the site's GitHub repository. From there, the same GitHub Action that builds the site and toots new blog posts picks it up, publishes the update and sends it out. It takes about three minutes from hitting publish to it appearing on Mastodon and Bluesky.

Because Micropub is a standard, any app that speaks it can post here. So far, I can publish from iA Writer on my laptop, and I've built a small web app for my phone that sits on the home screen like any other app. It has a character counter, so I know when Bluesky's 300-character limit will force a shortened version, and it won't let me publish a photo without a description. Alt text isn't optional.

> Caveat: Like the cross-posting setup, this was vibe-coded with Claude.  I know enough about how the web works, I knew that Micorpub could work and what I wanted, and knew enough to test it properly, but I didn't write the code myself.

It feels good to close that gap. Owning the long-form stuff was the easy part. The small stuff is where most of the web lives, and it's nice to have a home for it here too.
