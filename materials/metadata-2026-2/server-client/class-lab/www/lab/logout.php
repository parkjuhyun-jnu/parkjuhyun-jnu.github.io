<?php
// 실습실에서 나가기
require __DIR__ . '/../../lib/app.php';
start_session();
$_SESSION = [];
session_destroy();
header('Location: ./');
