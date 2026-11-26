<?php
// 웹 서버의 길잡이: 들어온 주소를 보고 어디로 보낼지 정합니다.
//   /u/<아이디>/…  → 학생 홈페이지 폴더(var/sites/<아이디>/)의 파일 (프로그램은 실행하지 않음)
//   그 밖          → www 폴더의 파일을 그대로 (false를 돌려주면 PHP 내장 웹 서버가 알아서 보냄)
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (preg_match('#^/u/([a-z][a-z0-9]{2,11})(/.*)?$#', $path, $m)) {
    require_once __DIR__ . '/../lib/sites.php';
    serve_site($m[1], $m[2] ?? '');
    return true;
}
if (preg_match('#/\.|^/router\.php#', $path)) {   // 숨김 파일과 길잡이 자신은 내보내지 않습니다
    http_response_code(404);
    echo 'Not Found';
    return true;
}
return false;
