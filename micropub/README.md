# Micropub endpoint for Updates

A single PHP file that lets Micropub apps (iA Writer, Quill, Indigenous and others) post **Updates** to heartsoulmachine.com. It runs on Reclaim Hosting at `https://timklapdor.me/micropub/`. The site itself stays on GitHub Pages.

## How a post travels

1. The app finds the endpoints through the `<link>` tags in `src/_includes/layouts/grid.njk`.
2. The first time you connect, you sign in on a password page (`/micropub/auth`) and the app gets a token.
3. Images upload to `/micropub/media` and wait in `micropub/uploads/` on Reclaim, so the app can preview them. They stay there for a week.
4. When you publish, the endpoint pulls any images out of the post body (keeping their alt text) and resizes them to fit Bluesky's 1 MB limit. Re-encoding them also strips EXIF data, including GPS location. It then commits the Markdown file and its images to `src/updates/` in **one commit**.
5. GitHub Actions builds and deploys the site. `scripts/post-updates.mjs` then posts the update to Mastodon and Bluesky and records the links in `src/_data/syndication.json`. Finally the site is rebuilt so the update shows "Also on Mastodon and Bluesky".

The update is live about 2 minutes after you publish, and on social media about a minute after that. The app opens the update's URL straight away, so expect a 404 until the build finishes.

## Where things live on Reclaim

| What | Path |
|---|---|
| Public endpoint files | `/home/timklapd/public_html/micropub/index.php` and `.htaccess` |
| Staged image uploads | `/home/timklapd/public_html/micropub/uploads/` (cleared after 7 days) |
| Private config | `/home/timklapd/micropub-private/config.php` (permissions 600) |
| Tokens, logs and state | `/home/timklapd/micropub-private/data/` |

The site runs PHP 8.2 with curl, GD, exif and mbstring.

`index.php` finds the config one level above the document root (`dirname(DOCUMENT_ROOT)/micropub-private/config.php`). If the document root ever changes, update the `$configPath` line near the top of `index.php`.

## Updating the endpoint

The copy in this repo (`micropub/public/index.php`) is the source. After changing it, upload it to `public_html/micropub/` in cPanel File Manager and overwrite the old file. Pushing to GitHub does **not** update Reclaim.

Quick check after an upload: `https://timklapdor.me/micropub/metadata` should show JSON. `https://timklapdor.me/micropub/` should show `{"error":"unauthorized",…}`.

## Setup from scratch

Use this if Reclaim needs to be rebuilt.

1. **Upload the public files.** In cPanel File Manager, create a `micropub` folder in the document root of `timklapdor.me` and upload `public/index.php` and `public/.htaccess` into it. File Manager hides dotfiles until you turn on *Settings → Show Hidden Files*. In the Finder file picker, press **Cmd+Shift+.** to see `.htaccess`.
2. **Create the private config.** Make a folder called `micropub-private` in your home folder, **next to** `public_html`, not inside it. Upload `config.sample.php` into it, rename it to `config.php` and set its permissions to `600`.
3. **Set a password.** In cPanel → Terminal, run the command below, type the password and press Enter. Typing it at the prompt keeps it out of your shell history.

   ```
   php -r 'echo password_hash(trim(fgets(STDIN)), PASSWORD_DEFAULT), PHP_EOL;'
   ```

   Paste the result into `password_hash` in `config.php`, inside **single quotes**.
4. **Create a GitHub token.** In GitHub → Settings → Developer settings → Fine-grained tokens:
   - Repository access: *Only select repositories* → `heart-soul-machine`
   - Permissions: *Contents* → *Read and write* (nothing else)
   - Paste it into `github_token` in `config.php`.
   - **It expires.** When it does, publishing fails with a GitHub error. Make a new token and paste it into `config.php`.
5. **Check it** using the quick check above.
6. **Mastodon token scope.** The `MASTODON_TOKEN` secret needs `write:media` as well as `write:statuses` for images.
7. **Connect your app.** Add a Micropub account and enter `https://heartsoulmachine.com/`. You'll be sent to the password page.

## Writing updates

```markdown
What you want to say. One or two short paragraphs.

![Describe the photo for someone who can't see it](photo.jpg)

#HashtagOne #HashtagTwo
```

- **No title or heading.** Updates don't have titles.
- **Length.** Under 300 characters posts in full everywhere. Up to 500 posts in full on Mastodon, but Bluesky gets a trimmed version with a link back. Anything longer is trimmed on both.
- **Hashtags** go at the end, in CamelCase (`#LearningDesign`) so screen readers read the words separately.
- **Images.** Up to 4. The text in the square brackets is the alt text, used on the site, Mastodon and Bluesky. The quoted title after the file name (`"…"`) is ignored. Always write alt text; the cross-posting log warns when it's missing.
- **Links.** Bare URLs work best. `[text](url)` becomes "text (url)" on social media.
- **Formatting** shows on the site but is stripped on Mastodon and Bluesky.

## How the endpoint handles iA Writer

iA Writer behaves differently from the Micropub spec in a few ways. The endpoint allows for each one:

- **It only sends drafts.** Drafts from apps listed in `publish_drafts_from` in `config.php` are published straight away. iA Writer (`https://ia.net/writer`) is the default. Drafts from any other app stay as drafts (see below).
- **It sends a fake title**, made from the first line of the text cut short. The endpoint drops any title that repeats the start of the text. A real title is kept as a bold first line.
- **It shows a spinner with no feedback**, which makes it easy to publish twice. The same update sent again within 15 minutes is ignored, and the app gets the first one's URL back.
- **It reuses image URLs** when you publish the same document again. The endpoint remembers which uploads it has already saved and reuses them. If an upload has expired (after 7 days), you get an error asking you to add the image again.

## Day to day

- **Drafts** (from apps not listed in `publish_drafts_from`) are committed to `src/updates/` but not built or cross-posted. To publish one, delete its `draft`, `permalink: false` and `eleventyExcludeFromCollections` lines, and remove the `#` before the commented `permalink` line.
- **Editing or deleting.** Not supported over Micropub. Edit or delete the file in `src/updates/` in the repo. Editing an update on the site doesn't change the copies on Mastodon and Bluesky; delete or edit those on the platforms.
- **Removing an update completely.** Delete its file and image(s) from `src/updates/`, remove its entry from `src/_data/syndication.json`, and delete the social posts by hand.
- **Pull before editing locally.** Updates and cross-posting state are committed on GitHub, so run `git pull` before you work in Obsidian or your editor.
- **Signing out an app.** Delete its entry from `micropub-private/data/tokens.json`. To sign out every app, delete the whole file.
- **Locked out.** Five wrong passwords lock sign-in for 15 minutes. To clear the lock straight away, delete `micropub-private/data/lockout.json`.
- **Debugging an app.** `micropub-private/data/requests.json` keeps the last 50 requests: which fields the app sent, the status, the photos and alt text, and the first 120 characters of the text.

## Files in `micropub-private/data/`

| File | What it holds |
|---|---|
| `tokens.json` | Signed-in apps (tokens are stored hashed) |
| `codes.json` | Short-lived sign-in codes |
| `lockout.json` | Recent failed password attempts |
| `secret.key` | Signs the login form; created automatically |
| `recent.json` | Recent updates, for the duplicate guard |
| `media-map.json` | Uploads already saved to the repo |
| `last-post.json` | Keeps each update's URL unique to the second |
| `requests.json` | Debug log of the last 50 requests |

All of these are recreated automatically if deleted. Deleting `tokens.json` signs out every app.

## Safety nets

- The cross-poster ignores updates older than 72 hours, so a lost `syndication.json` can't flood your accounts with old posts.
- An update is never posted twice to the same platform. Its link in `syndication.json` is the record.
- Only one cross-posting job runs at a time.
- If a cross-posting run goes wrong, cancel it in the GitHub Actions tab. The toot job waits 60 seconds before posting, which gives you time.
