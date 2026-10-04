<?php
// Copy this to micropub-private/config.php on your Reclaim account – a
// folder NEXT TO public_html, not inside it, so nobody can download it.
//
//   /home/<you>/public_html/micropub/index.php      (public)
//   /home/<you>/public_html/micropub/.htaccess      (public)
//   /home/<you>/micropub-private/config.php         (private – this file)
//   /home/<you>/micropub-private/data/              (created automatically)

return [
    // Your site – the URL you type into Micropub apps to sign in
    'me' => 'https://heartsoulmachine.com/',
    'name' => 'Tim Klapdor',

    // Where index.php lives (must match the <link> tags in grid.njk)
    'base_url' => 'https://timklapdor.me/micropub/',

    // Sign-in password, stored as a hash. Make one in cPanel's Terminal with:
    //   php -r "echo password_hash('your-password-here', PASSWORD_DEFAULT), PHP_EOL;"
    'password_hash' => '$2y$10$REPLACE_ME',

    // Fine-grained GitHub token: Repository access = only heart-soul-machine,
    // Permissions = Contents: Read and write. Nothing else.
    'github_token' => 'github_pat_REPLACE_ME',
    'github_repo' => 'timklapdor/heart-soul-machine',
    'github_branch' => 'main',

    'site_url' => 'https://heartsoulmachine.com',
    'timezone' => 'Australia/Adelaide',

    // Tokens, login codes and the form secret are kept here
    'data_dir' => __DIR__ . '/data',

    // Images are resized to fit this (longest side) and kept under ~1 MB
    'max_image_px' => 2000,
    'jpeg_quality' => 82,
];
