<?php
/**
 * Micropub + IndieAuth endpoint for heartsoulmachine.com "Updates".
 *
 * One file, no database, no dependencies. It:
 *   - signs you in to Micropub apps (IndieAuth: /auth, /token, /revoke, /metadata)
 *   - accepts image uploads and holds them here until the post is sent (/media)
 *   - turns each post into a Markdown file in src/updates/ and commits it,
 *     with its images, to GitHub in a single commit (/)
 *
 * GitHub Actions then builds the site and cross-posts to Mastodon and Bluesky.
 *
 * Setup: see README.md next to this folder in the repo.
 */

declare(strict_types=1);

// ------------------------------------------------------------- config --

// The config file lives OUTSIDE the web root. By default that's a folder
// called micropub-private next to your public_html (or addon-domain) folder.
// Change this line if you put it somewhere else.
$configPath = dirname($_SERVER['DOCUMENT_ROOT'] ?? __DIR__) . '/micropub-private/config.php';

if (!is_file($configPath)) {
    http_response_code(500);
    exit('Micropub endpoint is not configured yet (config.php not found).');
}
$config = require $configPath;
$config['base_url'] = rtrim($config['base_url'], '/') . '/';
$config['site_url'] = rtrim($config['site_url'], '/');
$config['upload_dir'] = __DIR__ . '/uploads';
$config['upload_url'] = $config['base_url'] . 'uploads/';
date_default_timezone_set($config['timezone'] ?? 'Australia/Adelaide');

if (!is_dir($config['data_dir'])) {
    mkdir($config['data_dir'], 0700, true);
}

// --------------------------------------------------------------- utils --

function json_out(array $data, int $status = 200, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    foreach ($headers as $h) {
        header($h);
    }
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function error_out(string $error, string $description, int $status = 400): never
{
    json_out(['error' => $error, 'error_description' => $description], $status);
}

function h(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function base64url(string $bytes): string
{
    return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
}

function random_token(): string
{
    return bin2hex(random_bytes(32));
}

/** Read-modify-write a JSON file in the private data folder, with a lock. */
function store(string $name, ?callable $modify = null): array
{
    global $config;
    $path = $config['data_dir'] . '/' . $name . '.json';
    $fh = fopen($path, 'c+');
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $data = $raw ? (json_decode($raw, true) ?: []) : [];
    if ($modify) {
        $data = $modify($data);
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $data;
}

/** Secret used to sign the login form, created on first use. */
function form_secret(): string
{
    global $config;
    $path = $config['data_dir'] . '/secret.key';
    if (!is_file($path)) {
        file_put_contents($path, random_token());
        chmod($path, 0600);
    }
    return trim(file_get_contents($path));
}

function request_body(): array
{
    static $body = null;
    if ($body !== null) {
        return $body;
    }
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($type, 'application/json') !== false) {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
    } else {
        $body = $_POST;
    }
    return $body;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('getallheaders') ? (array_change_key_case(getallheaders())['authorization'] ?? null) : null);
    if ($header && preg_match('/^Bearer\s+(\S+)$/i', trim($header), $m)) {
        return $m[1];
    }
    // Micropub also allows the token in the form body.
    $body = request_body();
    return isset($body['access_token']) && is_string($body['access_token']) ? $body['access_token'] : null;
}

/** Checks the access token and scope; returns the token record. */
function require_token(?string $scope = null): array
{
    $token = bearer_token();
    if (!$token) {
        error_out('unauthorized', 'No access token was provided.', 401);
    }
    $tokens = store('tokens');
    $record = $tokens[hash('sha256', $token)] ?? null;
    if (!$record) {
        error_out('unauthorized', 'The access token is not valid.', 401);
    }
    if ($scope) {
        $granted = explode(' ', $record['scope']);
        // A token allowed to create posts may also upload the post's images.
        $ok = in_array($scope, $granted, true) || ($scope === 'media' && in_array('create', $granted, true));
        if (!$ok) {
            error_out('insufficient_scope', "This token does not have the '$scope' scope.", 403);
        }
    }
    return $record;
}

// ----------------------------------------------------------- indieauth --

function endpoint_metadata(): never
{
    global $config;
    $b = $config['base_url'];
    json_out([
        'issuer' => $b,
        'authorization_endpoint' => $b . 'auth',
        'token_endpoint' => $b . 'token',
        'revocation_endpoint' => $b . 'revoke',
        'scopes_supported' => ['create', 'media', 'profile'],
        'response_types_supported' => ['code'],
        'grant_types_supported' => ['authorization_code'],
        'code_challenge_methods_supported' => ['S256', 'plain'],
        'authorization_response_iss_parameter_supported' => true,
    ]);
}

function safe_redirect_uri(string $uri): bool
{
    $scheme = strtolower((string)parse_url($uri, PHP_URL_SCHEME));
    // Native apps (like iA Writer) use their own scheme, e.g. ia-writer://
    return $scheme !== '' && !in_array($scheme, ['javascript', 'data', 'vbscript', 'file'], true);
}

/** Exchanges a one-time code; used by both /auth and /token. */
function redeem_code(array $p): array
{
    $code = (string)($p['code'] ?? '');
    $record = null;
    store('codes', function ($codes) use ($code, &$record) {
        $key = hash('sha256', $code);
        $record = $codes[$key] ?? null;
        unset($codes[$key]); // one use only
        return array_filter($codes, fn($c) => $c['expires'] > time());
    });
    if (!$record || $record['expires'] < time()) {
        error_out('invalid_grant', 'The code is invalid or has expired.');
    }
    if (($p['client_id'] ?? '') !== $record['client_id'] || ($p['redirect_uri'] ?? '') !== $record['redirect_uri']) {
        error_out('invalid_grant', 'client_id or redirect_uri does not match the original request.');
    }
    if ($record['code_challenge'] !== '') {
        $verifier = (string)($p['code_verifier'] ?? '');
        $expected = $record['code_challenge_method'] === 'plain' ? $verifier : base64url(hash('sha256', $verifier, true));
        if ($verifier === '' || !hash_equals($record['code_challenge'], $expected)) {
            error_out('invalid_grant', 'The code_verifier is not valid.');
        }
    }
    return $record;
}

function login_page(array $req, string $message = ''): never
{
    $payload = base64url(json_encode($req));
    $sig = hash_hmac('sha256', $payload, form_secret());
    $scopes = $req['scope'] !== '' ? explode(' ', $req['scope']) : [];
    $labels = ['create' => 'Publish updates to your site', 'media' => 'Upload images', 'profile' => 'See your profile'];
    header('Content-Type: text/html; charset=utf-8');
    header('X-Frame-Options: DENY');
    header('Cache-Control: no-store');
    ?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in – Heart Soul Machine</title>
<style>
  :root { color-scheme: light dark; --bg: #FFFCF0; --fg: #100F0F; --muted: #6F6E69; --accent: #ff0e69; --line: #DAD8CE; }
  @media (prefers-color-scheme: dark) { :root { --bg: #100F0F; --fg: #CECDC3; --muted: #878580; --line: #343331; } }
  body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); margin: 0; padding: 16px; }
  main { max-width: 26rem; margin: 10vh auto; }
  h1 { font-size: 1.4rem; }
  .app { word-break: break-all; font-weight: 600; }
  ul { padding-left: 1.2rem; }
  small { color: var(--muted); display: block; word-break: break-all; margin: 1rem 0; }
  label { display: block; margin: 1.2rem 0 .4rem; }
  input[type=password] { width: 100%; box-sizing: border-box; padding: .6rem; font-size: 1rem; border: 1px solid var(--line); border-radius: 4px; background: transparent; color: inherit; }
  button { margin-top: 1rem; padding: .6rem 1.2rem; font-size: 1rem; border: 0; border-radius: 4px; background: var(--accent); color: #fff; cursor: pointer; }
  .error { color: var(--accent); font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>Sign in to heartsoulmachine.com</h1>
  <p><span class="app"><?= h($req['client_id']) ?></span> is asking to:</p>
  <ul>
    <?php foreach ($scopes ?: ['create'] as $s): ?>
      <li><?= h($labels[$s] ?? $s) ?></li>
    <?php endforeach; ?>
  </ul>
  <small>You'll be sent back to <?= h($req['redirect_uri']) ?></small>
  <?php if ($message): ?><p class="error"><?= h($message) ?></p><?php endif; ?>
  <form method="post">
    <input type="hidden" name="req" value="<?= h($payload) ?>">
    <input type="hidden" name="sig" value="<?= h($sig) ?>">
    <label for="password">Password</label>
    <input type="password" id="password" name="password" autocomplete="current-password" autofocus required>
    <button type="submit">Allow</button>
  </form>
</main>
</body>
</html>
    <?php
    exit;
}

function endpoint_auth(): never
{
    global $config;

    // Step 1: an app sends you here – show the sign-in page.
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $req = [
            'client_id' => (string)($_GET['client_id'] ?? ''),
            'redirect_uri' => (string)($_GET['redirect_uri'] ?? ''),
            'state' => (string)($_GET['state'] ?? ''),
            'scope' => trim((string)($_GET['scope'] ?? '')),
            'code_challenge' => (string)($_GET['code_challenge'] ?? ''),
            'code_challenge_method' => (string)($_GET['code_challenge_method'] ?? 'S256'),
        ];
        if ($req['client_id'] === '' || !safe_redirect_uri($req['redirect_uri'])) {
            http_response_code(400);
            exit('Missing or invalid client_id / redirect_uri.');
        }
        login_page($req);
    }

    // Step 2: you submitted the password.
    if (isset($_POST['password'])) {
        $payload = (string)($_POST['req'] ?? '');
        if (!hash_equals(hash_hmac('sha256', $payload, form_secret()), (string)($_POST['sig'] ?? ''))) {
            http_response_code(400);
            exit('Invalid form. Go back to the app and try again.');
        }
        $req = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);

        // Slow down password guessing: 5 failures locks sign-in for 15 minutes.
        $fails = store('lockout', fn($d) => array_values(array_filter($d, fn($t) => $t > time() - 900)));
        if (count($fails) >= 5) {
            login_page($req, 'Too many failed attempts. Try again in 15 minutes.');
        }
        if (!password_verify((string)$_POST['password'], $config['password_hash'])) {
            store('lockout', fn($d) => array_merge($d, [time()]));
            sleep(1);
            login_page($req, 'That password is not right.');
        }

        $code = random_token();
        store('codes', function ($codes) use ($code, $req) {
            $codes[hash('sha256', $code)] = $req + ['expires' => time() + 600];
            return $codes;
        });
        $sep = str_contains($req['redirect_uri'], '?') ? '&' : '?';
        header('Location: ' . $req['redirect_uri'] . $sep . http_build_query([
            'code' => $code,
            'state' => $req['state'],
            'iss' => $config['base_url'],
        ]));
        exit;
    }

    // Step 3 (sign-in only, no token): the app swaps the code for your URL.
    $record = redeem_code($_POST);
    $out = ['me' => $config['me']];
    if (in_array('profile', explode(' ', $record['scope']), true)) {
        $out['profile'] = ['name' => $config['name'] ?? '', 'url' => $config['me']];
    }
    json_out($out);
}

function endpoint_token(): never
{
    global $config;

    // Older clients check a token with GET + Authorization header.
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $record = require_token();
        json_out(['me' => $config['me'], 'client_id' => $record['client_id'], 'scope' => $record['scope']]);
    }

    $p = request_body();
    if (($p['action'] ?? '') === 'revoke') {
        endpoint_revoke();
    }
    if (($p['grant_type'] ?? '') !== 'authorization_code') {
        error_out('unsupported_grant_type', 'Only authorization_code is supported.');
    }

    $record = redeem_code($p);
    // You approved this app on the sign-in page; if it didn't ask for
    // specific scopes, let it post and upload.
    $scope = $record['scope'] !== '' ? $record['scope'] : 'create media';
    $token = random_token();
    store('tokens', function ($tokens) use ($token, $record, $scope) {
        $tokens[hash('sha256', $token)] = [
            'client_id' => $record['client_id'],
            'scope' => $scope,
            'issued' => date('c'),
        ];
        return $tokens;
    });
    json_out([
        'access_token' => $token,
        'token_type' => 'Bearer',
        'scope' => $scope,
        'me' => $config['me'],
    ]);
}

function endpoint_revoke(): never
{
    $token = (string)(request_body()['token'] ?? '');
    store('tokens', function ($tokens) use ($token) {
        unset($tokens[hash('sha256', $token)]);
        return $tokens;
    });
    json_out([]);
}

// -------------------------------------------------------------- images --

const IMAGE_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
];

/**
 * Resizes and re-encodes an image so it suits the web and Bluesky's
 * ~1 MB limit. Re-encoding also strips EXIF data, including GPS location.
 * GIFs are left alone (animation). Without the GD extension, the original
 * is kept as is. Returns [bytes, extension].
 */
function prepare_image(string $bytes): array
{
    global $config;
    $info = @getimagesizefromstring($bytes);
    if (!$info || !isset(IMAGE_TYPES[$info['mime']])) {
        throw new RuntimeException('Not a supported image (JPEG, PNG, GIF or WebP).');
    }
    $mime = $info['mime'];
    $ext = IMAGE_TYPES[$mime];
    if ($mime === 'image/gif' || !function_exists('imagecreatefromstring')) {
        return [$bytes, $ext];
    }

    $img = @imagecreatefromstring($bytes);
    if (!$img) {
        return [$bytes, $ext];
    }

    // Phone photos are often stored sideways with an EXIF rotation flag.
    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data('data://image/jpeg;base64,' . base64_encode($bytes));
        $rotate = [3 => 180, 6 => -90, 8 => 90][$exif['Orientation'] ?? 1] ?? 0;
        if ($rotate) {
            $img = imagerotate($img, $rotate, 0);
        }
    }

    $max = (int)($config['max_image_px'] ?? 2000);
    $w = imagesx($img);
    $h = imagesy($img);
    if (max($w, $h) > $max) {
        $scale = $max / max($w, $h);
        $img = imagescale($img, (int)round($w * $scale), (int)round($h * $scale), IMG_BICUBIC);
    }

    // Keep PNGs as PNG when they're small (screenshots, transparency).
    if ($mime === 'image/png') {
        ob_start();
        imagesavealpha($img, true);
        imagepng($img, null, 9);
        $png = ob_get_clean();
        if (strlen($png) < 950000) {
            return [$png, 'png'];
        }
        // Too big: flatten onto white and fall through to JPEG.
        $flat = imagecreatetruecolor(imagesx($img), imagesy($img));
        imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
        imagecopy($flat, $img, 0, 0, 0, 0, imagesx($img), imagesy($img));
        $img = $flat;
    }

    foreach ([(int)($config['jpeg_quality'] ?? 82), 72, 62, 52] as $q) {
        ob_start();
        imagejpeg($img, null, $q);
        $jpeg = ob_get_clean();
        if (strlen($jpeg) < 950000) {
            break;
        }
    }
    return [$jpeg, 'jpg'];
}

function new_image_name(string $ext): string
{
    return date('Y-m-d-His') . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
}

/** Deletes staged uploads older than a week. */
function purge_uploads(): void
{
    global $config;
    foreach (glob($config['upload_dir'] . '/*') ?: [] as $f) {
        if (is_file($f) && filemtime($f) < time() - 7 * 86400) {
            @unlink($f);
        }
    }
}

/** Saves an uploaded file to the staging folder; returns its public URL. */
function stage_upload(array $file): string
{
    global $config;
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        error_out('invalid_request', 'The file upload failed.');
    }
    try {
        [$bytes, $ext] = prepare_image(file_get_contents($file['tmp_name']));
    } catch (RuntimeException $e) {
        error_out('invalid_request', $e->getMessage(), 415);
    }
    if (!is_dir($config['upload_dir'])) {
        mkdir($config['upload_dir'], 0755, true);
    }
    $name = new_image_name($ext);
    file_put_contents($config['upload_dir'] . '/' . $name, $bytes);
    purge_uploads();
    return $config['upload_url'] . $name;
}

function endpoint_media(): never
{
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        require_token();
        json_out([]); // q=last etc. not supported
    }
    require_token('media');
    if (empty($_FILES['file'])) {
        error_out('invalid_request', 'Send the image as multipart/form-data in a field called "file".');
    }
    $url = stage_upload($_FILES['file']);
    json_out(['url' => $url], 201, ['Location: ' . $url]);
}

// -------------------------------------------------------------- github --

function github(string $method, string $path, ?array $body = null): array
{
    global $config;
    $ch = curl_init(($config['github_api'] ?? 'https://api.github.com') . '/repos/' . $config['github_repo'] . $path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $config['github_token'],
            'Accept: application/vnd.github+json',
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: heartsoulmachine-micropub',
            'Content-Type: application/json',
        ],
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return [$status, json_decode((string)$raw, true) ?: []];
}

/**
 * Commits several files to the repo as ONE commit (one build, one
 * cross-post run) using the Git Data API. $files = [repoPath => bytes].
 */
function commit_files(array $files, string $message): void
{
    global $config;
    $branch = $config['github_branch'] ?? 'main';

    $tree = [];
    foreach ($files as $path => $bytes) {
        [$status, $blob] = github('POST', '/git/blobs', ['content' => base64_encode($bytes), 'encoding' => 'base64']);
        if ($status !== 201) {
            throw new RuntimeException("GitHub blob failed ($status): " . ($blob['message'] ?? ''));
        }
        $tree[] = ['path' => $path, 'mode' => '100644', 'type' => 'blob', 'sha' => $blob['sha']];
    }

    // Retry if someone else (e.g. the Actions bot) pushed in the meantime.
    for ($attempt = 1; $attempt <= 3; $attempt++) {
        [$status, $ref] = github('GET', '/git/ref/heads/' . $branch);
        if ($status !== 200) {
            throw new RuntimeException("GitHub ref failed ($status): " . ($ref['message'] ?? ''));
        }
        $parent = $ref['object']['sha'];
        [, $parentCommit] = github('GET', '/git/commits/' . $parent);
        [$status, $newTree] = github('POST', '/git/trees', ['base_tree' => $parentCommit['tree']['sha'], 'tree' => $tree]);
        if ($status !== 201) {
            throw new RuntimeException("GitHub tree failed ($status): " . ($newTree['message'] ?? ''));
        }
        [$status, $commit] = github('POST', '/git/commits', [
            'message' => $message,
            'tree' => $newTree['sha'],
            'parents' => [$parent],
        ]);
        if ($status !== 201) {
            throw new RuntimeException("GitHub commit failed ($status): " . ($commit['message'] ?? ''));
        }
        [$status] = github('PATCH', '/git/refs/heads/' . $branch, ['sha' => $commit['sha'], 'force' => false]);
        if ($status === 200) {
            return;
        }
        usleep(500000);
    }
    throw new RuntimeException('GitHub kept rejecting the update to ' . $branch . '.');
}

// ------------------------------------------------------------ micropub --

/** Normalises form-encoded and JSON requests into one shape. */
function parse_entry(): array
{
    $body = request_body();
    $isJson = isset($body['type']) || isset($body['properties']) || isset($body['action']);

    if (isset($body['action'])) {
        error_out('invalid_request', 'Only creating new updates is supported here. Edit or delete them in the repo.');
    }

    $entry = ['content' => '', 'html' => false, 'name' => '', 'photos' => [], 'tags' => []];

    if ($isJson) {
        $props = $body['properties'] ?? [];
        $content = $props['content'][0] ?? '';
        if (is_array($content)) {
            $entry['html'] = isset($content['html']);
            $entry['content'] = (string)($content['html'] ?? $content['value'] ?? '');
        } else {
            $entry['content'] = (string)$content;
        }
        $entry['name'] = (string)($props['name'][0] ?? '');
        foreach ($props['photo'] ?? [] as $p) {
            $entry['photos'][] = is_array($p)
                ? ['url' => (string)($p['value'] ?? ''), 'alt' => (string)($p['alt'] ?? '')]
                : ['url' => (string)$p, 'alt' => ''];
        }
        $entry['tags'] = array_map('strval', $props['category'] ?? []);
        return $entry;
    }

    // Form-encoded / multipart
    $content = $body['content'] ?? '';
    if (is_array($content)) {
        $entry['html'] = isset($content['html']);
        $content = $content['html'] ?? $content['value'] ?? '';
    }
    $entry['content'] = (string)$content;
    $entry['name'] = (string)($body['name'] ?? '');

    $photos = $body['photo'] ?? [];
    $alts = (array)($body['mp-photo-alt'] ?? $body['photo-alt'] ?? []);
    foreach ((array)$photos as $i => $p) {
        $entry['photos'][] = is_array($p)
            ? ['url' => (string)($p['value'] ?? ''), 'alt' => (string)($p['alt'] ?? '')]
            : ['url' => (string)$p, 'alt' => (string)($alts[$i] ?? '')];
    }

    // Photos sent as files in the same request
    if (!empty($_FILES['photo'])) {
        $f = $_FILES['photo'];
        $count = is_array($f['name']) ? count($f['name']) : 1;
        for ($i = 0; $i < $count; $i++) {
            $one = is_array($f['name'])
                ? ['name' => $f['name'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i]]
                : $f;
            $entry['photos'][] = ['url' => stage_upload($one), 'alt' => (string)($alts[$i] ?? '')];
        }
    }

    $tags = $body['category'] ?? [];
    $entry['tags'] = array_map('strval', is_array($tags) ? $tags : array_filter(array_map('trim', explode(',', (string)$tags))));
    return $entry;
}

/** Moves images out of the body text into the photos list (with alt text). */
function extract_inline_images(array $entry): array
{
    $found = [];
    $content = $entry['content'];

    // Markdown: ![alt](url "title")
    $content = preg_replace_callback('/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/', function ($m) use (&$found) {
        $found[] = ['url' => $m[2], 'alt' => $m[1]];
        return '';
    }, $content);

    // HTML: <img src="" alt="">
    $content = preg_replace_callback('/<img\b[^>]*>/i', function ($m) use (&$found) {
        $attr = fn($name) => preg_match('/\b' . $name . '\s*=\s*("([^"]*)"|\'([^\']*)\')/i', $m[0], $a)
            ? html_entity_decode($a[2] !== '' ? $a[2] : ($a[3] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8')
            : '';
        if ($attr('src') !== '') {
            $found[] = ['url' => $attr('src'), 'alt' => $attr('alt')];
        }
        return '';
    }, $content);

    // Tidy wrappers the images leave behind
    $content = preg_replace('#<figure[^>]*>\s*(<figcaption>.*?</figcaption>)?\s*</figure>#is', '', $content);
    $content = preg_replace('#<p>(\s|&nbsp;|<br\s*/?>)*</p>#i', '', $content);

    $known = array_column($entry['photos'], 'url');
    foreach ($found as $f) {
        $i = array_search($f['url'], $known, true);
        if ($i === false) {
            $entry['photos'][] = $f;
            $known[] = $f['url'];
        } elseif ($entry['photos'][$i]['alt'] === '' && $f['alt'] !== '') {
            $entry['photos'][$i]['alt'] = $f['alt'];
        }
    }
    $entry['content'] = trim(preg_replace('/(\S) {2,}(\S)/', '$1 $2', $content));
    return $entry;
}

/**
 * Brings every photo into the repo: staged uploads are picked up from this
 * server, other URLs are downloaded. Returns [photos with site URLs, files].
 */
function collect_photos(array $photos): array
{
    global $config;
    $files = [];
    $out = [];
    foreach (array_slice($photos, 0, 4) as $p) {
        $url = $p['url'];
        $bytes = null;
        if (str_starts_with($url, $config['upload_url'])) {
            $local = $config['upload_dir'] . '/' . basename(parse_url($url, PHP_URL_PATH));
            if (is_file($local)) {
                $bytes = file_get_contents($local);
                @unlink($local);
                $ext = pathinfo($local, PATHINFO_EXTENSION);
            }
        } elseif (preg_match('#^https?://#i', $url)) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 20, CURLOPT_MAXFILESIZE => 25_000_000]);
            $raw = curl_exec($ch);
            $ok = curl_getinfo($ch, CURLINFO_RESPONSE_CODE) === 200;
            curl_close($ch);
            if ($ok && $raw) {
                try {
                    [$bytes, $ext] = prepare_image($raw);
                } catch (RuntimeException) {
                    $bytes = null;
                }
            }
        }
        if ($bytes === null) {
            // Couldn't fetch it – keep the original link rather than lose it.
            $out[] = ['url' => $url, 'alt' => $p['alt']];
            continue;
        }
        $name = new_image_name($ext);
        $files['src/updates/images/' . $name] = $bytes;
        $out[] = ['url' => '/updates/images/' . $name, 'alt' => $p['alt']];
    }
    return [$out, $files];
}

function yaml_string(string $s): string
{
    // A JSON string is also a valid YAML double-quoted string.
    return json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function endpoint_micropub(): never
{
    global $config;

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        require_token();
        $q = $_GET['q'] ?? '';
        if ($q === 'config') {
            json_out([
                'media-endpoint' => $config['base_url'] . 'media',
                'syndicate-to' => [],
                'post-types' => [
                    ['type' => 'note', 'name' => 'Update'],
                    ['type' => 'photo', 'name' => 'Photo'],
                ],
            ]);
        }
        if ($q === 'syndicate-to') {
            json_out(['syndicate-to' => []]);
        }
        error_out('invalid_request', 'Unsupported query.');
    }

    $token = require_token('create');
    $entry = extract_inline_images(parse_entry());

    if ($entry['name'] !== '') {
        // Updates have no titles; keep a title if the app sent one.
        $entry['content'] = ($entry['html'] ? '<p><strong>' . h($entry['name']) . '</strong></p>' : '**' . $entry['name'] . "**\n\n") . $entry['content'];
    }
    if (trim(strip_tags($entry['content'])) === '' && !$entry['photos']) {
        error_out('invalid_request', 'The update is empty.');
    }

    try {
        [$photos, $files] = collect_photos($entry['photos']);

        // One update per second at most, so two quick posts can't share a URL.
        $now = new DateTimeImmutable();
        $last = store('last-post')['time'] ?? 0;
        if ($now->getTimestamp() <= $last) {
            $now = (new DateTimeImmutable())->setTimestamp($last + 1);
        }
        store('last-post', fn() => ['time' => $now->getTimestamp()]);
        $slug = $now->format('Y-m-d-His');
        $permalink = '/updates/' . $now->format('Y/m/d/His') . '/';

        $fm = ['---', 'date: ' . $now->format('c'), 'permalink: ' . $permalink];
        if ($photos) {
            $fm[] = 'photos:';
            foreach ($photos as $p) {
                $fm[] = '  - url: ' . yaml_string($p['url']);
                $fm[] = '    alt: ' . yaml_string($p['alt']);
            }
        }
        $tags = array_values(array_filter(array_map('trim', $entry['tags'])));
        if ($tags) {
            $fm[] = 'updateTags:';
            foreach ($tags as $t) {
                $fm[] = '  - ' . yaml_string($t);
            }
        }
        $fm[] = 'via: ' . yaml_string($token['client_id']);
        $fm[] = '---';

        $files['src/updates/' . $slug . '.md'] = implode("\n", $fm) . "\n" . $entry['content'] . "\n";

        $preview = mb_substr(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($entry['content']), ENT_QUOTES | ENT_HTML5, 'UTF-8')), 0, 50);
        commit_files($files, 'Update: ' . ($preview !== '' ? $preview : 'photo') . "\n\nPosted via Micropub from " . $token['client_id']);
    } catch (Throwable $e) {
        error_log('micropub: ' . $e->getMessage());
        error_out('server_error', 'Could not save the update: ' . $e->getMessage(), 500);
    }

    // The page goes live once GitHub Actions has built the site (1–2 min).
    http_response_code(201);
    header('Location: ' . $config['site_url'] . $permalink);
    exit;
}

// -------------------------------------------------------------- router --

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

match ($_GET['endpoint'] ?? 'micropub') {
    'metadata' => endpoint_metadata(),
    'auth' => endpoint_auth(),
    'token' => endpoint_token(),
    'revoke' => endpoint_revoke(),
    'media' => endpoint_media(),
    default => endpoint_micropub(),
};
