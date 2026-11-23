<?php
// 3단계 덧붙임: 같은 검색을 JSON으로 돌려주는 API. 예) api.php?q=권정생&age=9세부터
require __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$db = open_db();
if (!$db) {
    http_response_code(503);
    echo json_encode(['error' => '데이터베이스가 아직 없습니다.'], JSON_UNESCAPED_UNICODE);
    exit;
}
$q = param('q');
$field = param('field', 10) ?: 'all';
$age = param('age', 10);
$genre = param('genre', 20);
$res = find_books($db, $q, $field, $age, $genre, 50);
foreach ($res['rows'] as &$r) { $r['id'] = (int) $r['id']; $r['pub_year'] = is_numeric($r['pub_year']) ? (int) $r['pub_year'] : $r['pub_year']; }
echo json_encode([
    'query' => ['q' => $q, 'field' => $field, 'age' => $age, 'genre' => $genre],
    'total' => $res['total'],
    'returned' => count($res['rows']),
    'source' => '(사)어린이도서연구회 추천 목록의 서지 사항 (수업 실습용)',
    'books' => $res['rows'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
