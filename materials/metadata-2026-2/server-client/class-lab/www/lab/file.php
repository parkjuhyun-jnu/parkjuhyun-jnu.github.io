<?php
// 아카이브 파일 내보내기. 로그인한 사람만 받습니다. 원본은 소유자와 교수만.
// 폰(특히 아이폰)에서 영상을 틀려면 '일부분 보내기(Range)'가 필요해서 직접 처리합니다.
require __DIR__ . '/../../lib/archive.php';
$u = me();
if (!$u) { http_response_code(403); exit('로그인이 필요합니다.'); }
$it = item((int) ($_GET['id'] ?? 0));
$f = (string) ($_GET['f'] ?? '');
if (!$it) { http_response_code(404); exit; }

if ($f === 'original') {
    if (!can_edit($u, $it)) { http_response_code(403); exit('원본은 올린 사람과 교수만 내려받습니다. 다른 사람은 이용본을 봅니다.'); }
    $path = arch_dir((int) $it['id']) . '/' . $it['stored'];
    $type = $it['mime'];
    $download = $it['orig_name'];
} elseif (in_array($f, ['access.jpg', 'thumb.jpg', 'thumb.png', 'access.mp3', 'access.mp4'], true)) {
    $path = arch_dir((int) $it['id']) . "/$f";
    $type = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'mp3' => 'audio/mpeg', 'mp4' => 'video/mp4'][pathinfo($f, PATHINFO_EXTENSION)];
    $download = null;
} else { http_response_code(404); exit; }
if (!is_file($path)) { http_response_code(404); exit; }

$size = filesize($path);
$start = 0; $end = $size - 1;
header('Accept-Ranges: bytes');
header('Content-Type: ' . $type);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, max-age=300');
if ($download !== null) header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($download));
if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
    if ($m[1] === '' && $m[2] !== '') { $start = max(0, $size - (int) $m[2]); }
    else { $start = (int) $m[1]; if ($m[2] !== '') $end = min($end, (int) $m[2]); }
    if ($start > $end || $start >= $size) { http_response_code(416); header("Content-Range: bytes */$size"); exit; }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
}
$len = $end - $start + 1;
header('Content-Length: ' . $len);
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') exit;
session_write_close();   // 긴 영상을 보내는 동안 같은 사람의 다른 요청이 기다리지 않게
$h = fopen($path, 'rb');
fseek($h, $start);
while ($len > 0 && !feof($h) && !connection_aborted()) {
    $chunk = fread($h, (int) min(262144, $len));
    echo $chunk; flush();
    $len -= strlen($chunk);
}
fclose($h);
