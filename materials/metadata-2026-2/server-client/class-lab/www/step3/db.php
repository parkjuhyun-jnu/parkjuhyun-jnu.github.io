<?php
// 3단계 공통: 데이터베이스(books.db)를 열고 책을 찾는 함수.
// 이 파일은 서버 안에서만 실행됩니다. 손님(브라우저)은 이 코드를 받지 못하고, 실행 결과만 받습니다.

// DB 파일은 웹 루트(www) 바깥에 둡니다 → 주소로는 받을 수 없고, PHP를 거쳐서만 물을 수 있습니다.
const DB_FILE = __DIR__ . '/../../data/books.db';
const MAX_ROWS = 100;

function open_db(): ?PDO {
    if (!is_file(DB_FILE)) return null;
    $db = new PDO('sqlite:' . DB_FILE, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::SQLITE_ATTR_OPEN_FLAGS => PDO::SQLITE_OPEN_READONLY,   // 읽기만 합니다
    ]);
    return $db;
}

/** 찾을 말(q)·칸(field)·연령(age)·갈래(genre)로 SQL을 만들어 실행합니다. */
function find_books(PDO $db, string $q, string $field, string $age, string $genre, int $limit = MAX_ROWS): array {
    $cols = ['title' => ['title'], 'author' => ['author'], 'publisher' => ['publisher'], 'all' => ['title', 'author', 'publisher']];
    $where = [];
    $params = [];
    if ($q !== '') {
        $or = [];
        foreach ($cols[$field] ?? $cols['all'] as $c) { $or[] = "$c LIKE ?"; $params[] = "%$q%"; }
        $where[] = '(' . implode(' OR ', $or) . ')';
    }
    if ($age !== '')   { $where[] = "(', ' || age || ', ') LIKE ?";   $params[] = "%, $age, %"; }
    if ($genre !== '') { $where[] = "(', ' || genre || ', ') LIKE ?"; $params[] = "%, $genre, %"; }
    $cond = $where ? ' WHERE ' . implode(' AND ', $where) : '';

    $t0 = microtime(true);
    $count = $db->prepare("SELECT COUNT(*) FROM book$cond");
    $count->execute($params);
    $total = (int) $count->fetchColumn();
    $sql = "SELECT id, title, author, publisher, pub_year, pages, age, genre, url FROM book$cond ORDER BY title LIMIT $limit";
    $st = $db->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll();
    $ms = (microtime(true) - $t0) * 1000;

    // 화면에 보여 줄 SQL: 물음표 자리에 실제 값을 넣어 읽기 쉽게 (실행은 위에서 안전하게 따로 했습니다)
    $shown = $sql;
    foreach ($params as $p) { $shown = preg_replace('/\?/', "'" . str_replace("'", "''", $p) . "'", $shown, 1); }
    return ['total' => $total, 'rows' => $rows, 'ms' => $ms, 'sql' => $shown];
}

function options(PDO $db, string $col): array {
    $set = [];
    foreach ($db->query("SELECT DISTINCT $col FROM book") as $r) {
        foreach (explode(', ', (string) $r[$col]) as $v) { if ($v !== '') $set[$v] = true; }
    }
    $list = array_keys($set);
    usort($list, fn($a, $b) => ((int) $a <=> (int) $b) ?: strcmp($a, $b));
    return $list;
}

function param(string $name, int $max = 40): string {
    $v = trim((string) ($_GET[$name] ?? ''));
    return preg_replace('/^(.{0,' . $max . '}).*$/us', '$1', $v);   // 너무 긴 입력은 자릅니다 (한글도 글자 단위)
}
