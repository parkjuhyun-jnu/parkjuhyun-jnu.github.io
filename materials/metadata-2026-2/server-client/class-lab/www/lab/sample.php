<?php
// 보기 파일 내려받기 (로그인한 사람만)
require __DIR__ . '/../../lib/app.php';
if (!me()) { http_response_code(403); exit('로그인이 필요합니다.'); }
$f = basename((string) ($_GET['f'] ?? ''));
$path = LAB_VAR . '/samples/' . $f;
if ($f === '' || $f[0] === '.' || !is_file($path)) { http_response_code(404); exit; }
header('Content-Type: application/octet-stream');
header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($f));
header('Content-Length: ' . filesize($path));
readfile($path);
