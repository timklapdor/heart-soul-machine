# Micropub endpoint for Updates

A single PHP file that lets Micropub apps (iA Writer, Quill, Indigenous and others) post **Updates** to heartsoulmachine.com. It runs on Reclaim Hosting. The site itself stays on GitHub Pages.

## How a post travels

1. iA Writer finds the endpoints through the `<link>` tags in `src/_includes/layouts/grid.njk`.
2. The first time you connect, you sign in on a password page (`/micropub/auth`) and the app gets a token.
3. Images upload to `/micropub/media` and wait in `micropub/uploads/` on Reclaim, so the app can preview them.
4. When you publish, the endpoint pulls any images out of the post body (keeping their alt text) and resizes them to fit Bluesky's 1 MB limit. Re-encoding them also strips EXIF data, including GPS location. It then commits the Markdown file and its images to `src/updates/` in **one commit**.
5. GitHub Actions builds and deploys the site. `scripts/post-updates.mjs` then posts the update to Mastodon and Bluesky and records the links in `src/_data/syndication.json`. Finally the site is rebuilt so the update shows "Also on Mastodon and Bluesky".

The update is live about 1–2 minutes after you publish, and on social media about a minute after that.

## Setup on Reclaim (one time)

Needs PHP 8.1 or later, with the curl and GD extensions. GD is used for images. Reclaim's PHP has both; choose the version in cPanel → *Select PHP Version*.

1. **Upload the public files.** In cPanel File Manager, create a `micropub` folder in the document root of `timklapdor.me` and upload:
   - `public/index.php` → `micropub/index.php`
   - `public/.htaccess` → `micropub/.htaccess` (File Manager hides dotfiles until you turn on *Show Hidden Files*)

2. **Create the private config.** Make a folder called `micropub-private` **next to** the document root, not inside it. For example, `/home/<you>/micropub-private/`. Copy `config.sample.php` into it as `config.php`.
   - If the document root of `timklapdor.me` isn't directly inside your home folder, change the `$configPath` line near the top of `index.php` to point to the config file.

3. **Set a password.** In cPanel → Terminal, run:

   ```
   php -r "echo password_hash('choose-a-long-password', PASSWORD_DEFAULT), PHP_EOL;"
   ```

   Paste the result into `password_hash` in `config.php`.

4. **Create a GitHub token.** In GitHub → Settings → Developer settings → Fine-grained tokens:
   - Repository access: *Only select repositories* → `heart-soul-machine`
   - Permissions: *Contents* → *Read and write* (nothing else)
   - Paste it into `github_token` in `config.php`.

5. **Check it.** Open `https://timklapdor.me/micropub/metadata`. You should see JSON. If you get a 404, the `.htaccess` isn't being read.

6. **Mastodon token scope.** Images need the token in the `MASTODON_TOKEN` secret to have `write:media` as well as `write:statuses`. If your current token only has `write:statuses`, create a new one in Mastodon → Preferences → Development and update the secret.

7. **Connect iA Writer.** In iA Writer's publishing settings, add a Micropub account and enter `https://heartsoulmachine.com/`. You'll be sent to the password page.

## Day to day

- **Alt text.** In iA Writer, the text in `![alt text](image.jpg)` becomes the alt text on the site, on Mastodon and on Bluesky. The cross-posting log warns about any image without alt text.
- **Tags.** Categories/tags you add in the app become hashtags on Mastodon and Bluesky.
- **Titles.** Updates don't have titles. If an app sends one, it's kept as a bold first line.
- **Editing or deleting.** Not supported over Micropub. Edit or delete the file in `src/updates/` in the repo. Once an update has been posted to social media, editing it on the site won't change the copies there.
- **Pull before editing locally.** Updates are committed on GitHub, so run `git pull` before you work in Obsidian or your editor.
- **Signing out an app.** Delete its entry from `micropub-private/data/tokens.json`. To sign out every app, delete the whole file.
- **Locked out.** Five wrong passwords lock sign-in for 15 minutes. To clear the lock straight away, delete `micropub-private/data/lockout.json`.

## Safety nets

- The cross-poster ignores updates older than 72 hours, so a lost `syndication.json` can't flood your accounts with old posts.
- An update is never posted twice to the same platform. Its link in `syndication.json` is the record.
- Only one cross-posting job runs at a time.
