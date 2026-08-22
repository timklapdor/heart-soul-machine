---
title: Obsidian and the Distributed Learning System
aliases:
  - Obsidian and the Distributed Learning System
categories:
  - "[[Blog]]"
status:
  - published
date: 2026-08-21
updatedDate:
updateDescription:
tags:
location:
coverImage:
summary: A personal learning system built on Obsidian, your own Domain, and ActivityPub Hubs could finally make the Distributed Learning System I sketched in 2017 a buildable reality.
commentId: '117137344370648107'
url: https://heartsoulmachine.com/blog/2026/08-21-obsidian-and-the-distributed-learning-system/
mastodonTags:
  - Blaugust
---
Back in 2017 I wrote a post called [Beyond the LMS](https://timklapdor.wordpress.com/2017/06/09/1822/) that sketched out an idea I called the *Distributed Learning System*. The core argument was simple: the LMS serves institutions, not learners. It enforces time-boxed access, centralises control, embeds surveillance, and locks students out of their own learning the moment a session ends. The alternative I proposed was a federated model – Nodes and Hubs – where each learner owns and controls their own space, connects to institutional Hubs when needed, and takes everything with them when they leave.

It was speculative at the time, but I think it's becoming buildable now.

### What the LMS Actually Does

The LMS hasn't changed much since 2017, and neither has the underlying problem. It's a system designed around institutional needs: processing grades, managing enrolments, tracking student activity. The learner is a secondary concern – a recipient of content, a submitter of assessments, a data point in an analytics dashboard.

My argument is that it isn't a tool for learning. It doesn't aid learning, not in any real sense; it simply provides an access point to some pretty ordinary tools – discussion boards, content repositories, assignment dropboxes. Things that could be replicated with documents and some cloud storage account. What's missing is any conception of the learner as someone with a continuous, growing body of knowledge that extends beyond a single course, a single session or a single institution. It's not designed for learning, but for administering an educational product. 

The LMS frames thinking about learning within the container of a course - a singular site, timeframe, and cohort. But learning doesn't have hard edges. It doesn't stop when the session ends. A student who finishes a subject on organisational behaviour and starts a subject on ethics is still the same person, still building the same understanding. The LMS treats them as two separate events. A genuine learning system would treat them as two moments in a continuous process. A body of knowledge that extends and grows organically. 

### The Node: Obsidian as Personal Learning System

Over the last couple of years, I've been spending more of my time with [Obsidian](https://obsidian.md/). And the more I use it, the more I see it as a practical realisation of the Node concept from that 2017 post.

Obsidian is a free, Markdown-based tool that stores files locally and lets you link, tag, and connect ideas into a knowledge graph. Critically, it embodies the principle of [file over app](https://stephango.com/file-over-app) – your files are yours, in an open format, readable by any text editor. No database lock-in, no subscription trap, no vendor dependency. I've migrated from Evernote to Ulysses and know exactly what those dependencies cost when you want to leave. Markdown and local files solve that problem.

What's changed my thinking about Obsidian is realising it's not just a writing tool – it's a personal information system. Plugins allow you to fetch data from the web, connect to external services via APIs, and automate workflows using basic JavaScript. I use one that pulls information from IMDB when I log what I'm watching. That same architecture could pull content from a course platform, sync discussion board posts, or receive feedback from a teaching team. The learner interacts only with their own Node – their own environment – and the institutional content comes to them.

This is exactly the model I described in 2017. The difference is that in 2017 I was sketching a system that would need to be built. Obsidian is a system that already exists, with an ecosystem of plugins and an architecture designed to support exactly this kind of extension. 

This desire for a personal knowledge system isn't new. Vannevar Bush imagined something like it in 1945 with the [Memex](https://en.wikipedia.org/wiki/Memex) — a device that would store all of a person's books, records, and communications, and allow them to trail through that material associatively rather than by fixed index. What Bush was describing was a machine that learned alongside you, accumulating and connecting your intellectual life rather than filing it away. Obsidian is the closest thing to a practical Memex I've encountered – modest in its ambitions, but real and usable today.

### The Hub: ActivityPub as the Connective Layer

In the 2017 model, Hubs were the institutional layer – course spaces where Nodes connect, content is distributed, and interactions occur. The Hub establishes the relationship between learners and the institution, defines what data is shared and for how long, and then releases the learner when the course ends – with their own copy of everything.

Mike Caulfield's [federated wiki project](https://hapgood.us/2014/06/25/federated-education-new-models-of-value-creation-in-networked-courses/) was an early attempt to build something like this in practice – shared public resources that individuals could fork, annotate, and make their own, while still connecting back to the commons. The personal copy and the shared space coexisted rather than competing. 

What makes this more concrete now is ActivityPub. ActivityPub is the open protocol that underpins the [fediverse](https://jointhefediverse.net/learn) – Mastodon and a growing range of other federated services. It's designed precisely for this: distributed nodes communicating through agreed protocols, without requiring a central authority. A course Hub running on ActivityPub would be a federated space – students subscribe to it from their own Node, receive content and discussion threads, contribute back, and then retain a local copy of everything when the course concludes.

Discussion boards are the obvious starting point. Currently, they're among the most valuable artefacts of a course – spaces where students share resources, build understanding together, and create something with genuine learning value. And then access is revoked. The discussion board gets switched off, and everything in it disappears from the student's world. A federated approach inverts this: the discussion happens in a shared Hub, but each participant's Node pulls down a local copy. The learning stays with the learner.

The same logic applies to course content, feedback, and assessment. Rather than the institution holding everything and granting access on its terms, the learner holds everything and grants the institution access on agreed terms. This is the shift from institutional management to personal ownership that the LMS has never been able to make.

### Your Domain as the Connector

The third layer is the web-facing component – what I'm thinking of as the Domain. Not necessarily a full Domain of One's Own in the original sense, but a web application that sits between the learner's personal Obsidian Node and the institutional Hub. It's the public or semi-public face of the learner's knowledge system: a place to publish, to share selectively, to make certain things visible to the institution for assessment purposes while keeping others private.

Obsidian already supports this through its publish features and, more practically, through plugins that push content to GitHub and generate a static website from your vault. The Domain becomes the learner's outward-facing layer – the interface through which they interact with the institutional Hub, submit work, and optionally share their learning more broadly.

The stack, then, looks like this: Obsidian as the personal Node, a Domain as the web connector, and ActivityPub Hubs as the federated course spaces. Each layer is already buildable with existing tools. What's missing isn't the technology – it's the will to configure it this way, and perhaps a plugin or two to connect the pieces more cleanly.

### Why This Matters

None of this requires massive infrastructure. We're talking about text files, Markdown, and protocols designed to run on modest hardware. The compute requirements are minimal – no large language models, no sprawling cloud dependencies, nothing that couldn't run on a phone or a basic local machine. Storage scales with what you put in it, and with cloud storage being ubiquitous, it's already in most learners' pockets.

What it does require is a different way of thinking about who the learning system serves. The LMS was built to serve the institution. The *Distributed Learning System* is built to serve the learner – and to keep serving them after the course ends, after the program concludes, after they've moved on to the next thing. That's what lifelong learning actually requires: not just the aspiration, but the infrastructure.

I've been living with my Personal Learning System for a couple of years now – but it's not connected or distributed. My Obsidian vault is where ideas accumulate, connect, and resurface. Posts from ten years ago link to things I'm thinking about today. Work I did at one institution informs what I'm doing at another. The knowledge doesn't disappear when the context changes – because it lives with me, not with the institution.

I think the pieces are finally here to start building something new!