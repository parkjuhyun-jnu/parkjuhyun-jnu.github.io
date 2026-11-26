<?php
// A 실습(내 홈페이지): 학생 폴더 var/sites/<아이디>/ 를 주소 /u/<아이디>/ 로 내보냅니다.
// 이 파일은 웹 서버의 길잡이(router.php)와 실습 화면(home.php)이 함께 씁니다.

declare(strict_types=1);
require_once __DIR__ . '/app.php';

const SITE_TYPES = [
    'html' => 'text/html; charset=utf-8', 'htm' => 'text/html; charset=utf-8',
    'css' => 'text/css; charset=utf-8', 'js' => 'text/javascript; charset=utf-8',
    'txt' => 'text/plain; charset=utf-8', 'md' => 'text/plain; charset=utf-8',
    'csv' => 'text/csv; charset=utf-8', 'tsv' => 'text/tab-separated-values; charset=utf-8',
    'json' => 'application/json; charset=utf-8', 'xml' => 'application/xml; charset=utf-8',
    'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif',
    'webp' => 'image/webp', 'svg' => 'image/svg+xml', 'ico' => 'image/x-icon',
    'mp3' => 'audio/mpeg', 'm4a' => 'audio/mp4', 'wav' => 'audio/wav', 'ogg' => 'audio/ogg',
    'mp4' => 'video/mp4', 'webm' => 'video/webm', 'pdf' => 'application/pdf',
];
const SITE_TEXT = ['html', 'htm', 'css', 'js', 'txt', 'md', 'csv', 'tsv', 'json', 'xml', 'svg'];

function site_dir(string $id): string { return LAB_VAR . '/sites/' . $id; }

/** 파일 이름 규칙: 영문, 숫자, 점, 밑줄, 붙임표만. 주소에 그대로 쓰기 좋은 이름입니다. */
function valid_name(string $n): bool {
    return (bool) preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$/', $n) && strpos($n, '..') === false;
}
function ext_of(string $n): string { $p = strrpos($n, '.'); return $p === false ? '' : strtolower(substr($n, $p + 1)); }

/** 'a/b' 같은 하위 폴더 경로를 확인합니다. 틀리면 null. */
function clean_rel(string $rel): ?string {
    $rel = trim(str_replace('\\', '/', $rel), '/');
    if ($rel === '') return '';
    $parts = explode('/', $rel);
    if (count($parts) > 4) return null;
    foreach ($parts as $p) if (!valid_name($p)) return null;
    return implode('/', $parts);
}

function site_usage(string $id): int {
    $dir = site_dir($id); $sum = 0;
    if (!is_dir($dir)) return 0;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) if ($f->isFile()) $sum += $f->getSize();
    return $sum;
}

function ensure_site(string $id, string $name): void {
    $dir = site_dir($id);
    if (is_dir($dir)) return;
    mkdir($dir, 0775, true);
    $html = <<<HTML
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$name}의 첫 페이지</title>
</head>
<body>
  <h1>{$name}의 첫 페이지</h1>
  <p>이 글은 서버의 <code>{$id}</code> 폴더에 있는 <code>index.html</code> 파일입니다.</p>
  <p>실습실의 [A 내 홈페이지]에서 이 파일을 고쳐 저장한 뒤, 이 화면을 새로고침해 보세요.</p>
</body>
</html>

HTML;
    file_put_contents($dir . '/index.html', $html);
}

/** 이 주소에 서버가 어떤 응답을 보낼지 정합니다: [상태 번호, 머리글 목록, 실제 파일 경로 또는 null, 본문(파일이 아닐 때)] */
function site_response(string $id, string $path): array {
    $base = site_dir($id);
    $common = ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'no-cache',
        // 학생 페이지는 실습실과 다른 손님처럼 다룹니다(실습실 로그인 정보를 읽지 못하게).
        'Content-Security-Policy' => 'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads',
        'Access-Control-Allow-Origin' => '*'];
    if (!is_dir($base)) {
        return [404, $common + ['Content-Type' => 'text/html; charset=utf-8'], null, not_found_page("'$id'라는 학생 폴더가 없습니다.")];
    }
    if ($path === '') return [301, $common + ['Location' => "/u/$id/"], null, ''];
    $rel = clean_rel(rawurldecode($path));
    if ($rel === null) return [404, $common + ['Content-Type' => 'text/html; charset=utf-8'], null, not_found_page('이 주소에 맞는 파일 이름이 아닙니다.')];
    $full = $rel === '' ? $base : "$base/$rel";
    if (is_dir($full)) {
        if (substr($path, -1) !== '/') return [301, $common + ['Location' => "/u/$id/$rel/"], null, ''];
        if (is_file("$full/index.html")) { $full .= '/index.html'; }
        else {
            $body = folder_page($id, $rel, $full);
            return [200, $common + ['Content-Type' => 'text/html; charset=utf-8', 'Content-Length' => (string) strlen($body)], null, $body];
        }
    }
    if (!is_file($full)) {
        // 학생이 자기 폴더 맨 위에 404.html을 만들어 두면 그 화면을 404 상태 번호와 함께 보냅니다
        $mine = site_dir($id) . '/404.html';
        if (is_file($mine)) return [404, $common + ['Content-Type' => 'text/html; charset=utf-8', 'Content-Length' => (string) filesize($mine)], $mine, null];
        return [404, $common + ['Content-Type' => 'text/html; charset=utf-8'], null, not_found_page('서버의 이 학생 폴더에 그런 파일이 없습니다.')];
    }
    $ext = ext_of($full);
    $type = SITE_TYPES[$ext] ?? 'application/octet-stream';
    if ($ext === 'php') $type = 'text/plain; charset=utf-8';   // 학생 폴더의 프로그램은 실행하지 않고 글자로만 보여 줍니다
    return [200, $common + ['Content-Type' => $type, 'Content-Length' => (string) filesize($full),
        'Last-Modified' => gmdate('D, d M Y H:i:s', filemtime($full)) . ' GMT'], $full, null];
}

function not_found_page(string $why): string {
    return '<!DOCTYPE html><html lang="ko"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>404 찾을 수 없음</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto;padding:0 1rem">'
        . '<h1>404 찾을 수 없음</h1><p>' . h($why) . '</p><p>주소의 철자와 대문자, 소문자를 다시 보세요. 서버는 <code>Index.html</code>과 <code>index.html</code>을 다른 파일로 봅니다.</p></body></html>';
}

function folder_page(string $id, string $rel, string $full): string {
    $rows = '';
    foreach (scandir($full) as $f) {
        if ($f[0] === '.') continue;
        $isdir = is_dir("$full/$f");
        $rows .= '<li><a href="' . h($f) . ($isdir ? '/' : '') . '">' . h($f) . ($isdir ? '/' : '') . '</a></li>';
    }
    return '<!DOCTYPE html><html lang="ko"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>/u/' . h($id) . '/' . h($rel) . '</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto;padding:0 1rem">'
        . '<h1>폴더 목록: /u/' . h($id) . '/' . h($rel) . '</h1><p>이 폴더에는 <code>index.html</code>이 없어서, 서버가 대신 파일 목록을 만들어 보냈습니다.</p><ul>' . $rows . '</ul></body></html>';
}

/** 길잡이(router.php)에서 부릅니다: 실제로 응답을 보내고 방문 기록을 남깁니다. */
function serve_site(string $id, string $path): void {
    [$status, $headers, $file, $body] = site_response($id, $path);
    http_response_code($status);
    foreach ($headers as $k => $v) header("$k: $v");
    $bytes = 0;
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') {
        if ($file) { $bytes = (int) filesize($file); readfile($file); }
        else { $bytes = strlen((string) $body); echo $body; }
    }
    try {
        $ip = client_ip();
        $ip = preg_replace('/\.\d+$/', '.***', $ip);   // 마지막 자리는 가립니다
        qexec('INSERT INTO visit (site, path, status, bytes, ip, agent, at) VALUES (?,?,?,?,?,?,?)',
            [$id, '/u/' . $id . $path, $status, $bytes, $ip, substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200), now()]);
        if (random_int(1, 200) === 1) qexec("DELETE FROM visit WHERE id < (SELECT MAX(id) - 20000 FROM visit)");
    } catch (Throwable $e) { /* 기록을 못 남겨도 응답은 보냅니다 */ }
}

function list_site(string $id, string $rel): array {
    $dir = site_dir($id) . ($rel === '' ? '' : "/$rel");
    $out = [];
    if (!is_dir($dir)) return $out;
    foreach (scandir($dir) as $f) {
        if ($f[0] === '.') continue;
        $p = "$dir/$f";
        $out[] = ['name' => $f, 'dir' => is_dir($p), 'size' => is_file($p) ? filesize($p) : 0, 'mtime' => filemtime($p), 'ext' => ext_of($f)];
    }
    usort($out, fn($a, $b) => [$b['dir'], $a['name']] <=> [$a['dir'], $b['name']]);
    return $out;
}

function rrmdir(string $d): void {
    if (!is_dir($d)) { if (is_file($d)) unlink($d); return; }
    foreach (scandir($d) as $f) if ($f !== '.' && $f !== '..') rrmdir("$d/$f");
    rmdir($d);
}
