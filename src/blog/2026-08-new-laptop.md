---
title: New Laptop, New Setup
aliases:
  - New Laptop, New Setup
categories:
  - "[[Blog]]"
status:
date: 2026-08-22
updatedDate:
updateDescription:
tags:
location:
coverImage:
summary: A quick list and quick install of my go-to apps for a new Mac.
commentId:
url:
mastodonTags:
  - Blaugust
---
Getting a new work laptop is always a mixed experience. On one hand, new machine. On the other, institutional IT has a habit of locking things down in ways that make setup more of a negotiation than a process. This time around, I have to request admin access to install things, and I only get a 30-minute window to do it in.

So I thought carefully about how to set up my Mac quickly and efficiently. Over time I've evolved a fairly stable list of applications I genuinely depend on, and rather than clicking through installers one by one, I used [Homebrew](https://brew.sh) — a command-line package manager that can install applications in bulk. I gave Claude my app list and asked it to generate the Brewfile script to do it, and it worked a treat. Apps are installed - now I just need to log in to everything and set them all up!

Here's the list — my go-to tools for starting up a new Mac.

**Dev Essentials**
- [Node](https://nodejs.org/en) - for 11ty / npm projects
- [NVM](https://github.com/nvm-sh/nvm) – Node version manager
- [Visual Studio Code](https://code.visualstudio.com/) – Code editor

**Browsers**
- [Zen Browser](https://zen-browser.app/) – Firefox-based browser with vertical tabs and spaces

**Notes & Writing**
- [Obsidian](https://obsidian.md/) – Local, Markdown-based knowledge management and note-taking
- [iA Writer](https://ia.net/writer) – Distraction-free writing Markdown editor
- [iA Presenter](https://ia.net/presenter) – Markdown-based presentation tool 
- [Grammarly](https://www.grammarly.com/) – Grammar checker

**Productivity**
- [AppCleaner](https://freemacsoft.net/appcleaner/) – Thorough app uninstaller
- [DaisyDisk](https://daisydiskapp.com/) – Disk space visualiser
- [CleanShot X](https://cleanshot.com/) – Screenshot and screen recording tool
- [DeskPad](https://github.com/Stengo/DeskPad) – Virtual display for screen sharing
- [Thaw](https://github.com/thaw-app/Thaw) – Menu bar manager 
- [Soulver](https://soulver.app/) – Notepad calculator
- [OmniFocus](https://www.omnigroup.com/omnifocus/) – Task management
- [WhatCable](https://www.whatcable.uk/) – Identifies what a USB-C cable can actually do

**Audio & Dictation**
- [Handy](https://handy.computer/) – Free, open-source offline speech-to-text dictation
- [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) – Audio transcription
- [Brain.fm](https://www.brain.fm/) – Focus music

**Security**
- [1Password](https://1password.com/) – Password manager

**Media**
- [VLC](https://www.videolan.org/vlc/) – Media player
- [Gifski](https://gif.ski/) – Video-to-GIF converter

**Cloud Storage**
- [Dropbox](https://www.dropbox.com/) – Cloud storage and file sync

If you're keen to do this yourself, there's the two files you'll need: `Brewfile` and `Install.sh`. You can [go ahead and edit these](https://gist.github.com/timklapdor/75cde5a65ea5744b5c770998dee8bbc5) to suit your needs - then just type into the terminal: 

```
chmod +x install.sh
./install.sh
```