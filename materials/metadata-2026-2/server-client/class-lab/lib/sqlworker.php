<?php
// 학생이 쓴 SQL을 따로 떨어진 프로그램(이 파일)에서 실행합니다.
// 실습실 화면(sqlrun.php)이 이 프로그램을 띄우고, 몇 초 안에 끝나지 않으면 강제로 끕니다.
// 입력(표준 입력, JSON): {"mode": "catalog|shared|mydb|check", "sql": "...", "user": "아이디", "db": "파일 경로"}
// 출력(표준 출력, JSON): {"ok": true, "results": [...]} 또는 {"ok": false, "error": "..."}

declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$in = json_decode((string) stream_get_contents(STDIN), true) ?: [];
$mode = $in['mode'] ?? 'catalog';
$sql = (string) ($in['sql'] ?? '');
$user = (string) ($in['user'] ?? '');
$var = (string) ($in['var'] ?? '');
const MAX_ROWS = 300;

function out(array $a): void { echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit; }

/** 세미콜론으로 문장을 나눕니다. 따옴표 안과 주석 안, CREATE TRIGGER … END 안의 세미콜론은 나누지 않습니다. */
function split_sql(string $s): array {
    $out = []; $cur = ''; $n = strlen($s); $i = 0; $depthTrigger = false;
    while ($i < $n) {
        $c = $s[$i];
        if ($c === '-' && ($s[$i + 1] ?? '') === '-') { $j = strpos($s, "\n", $i); $j = $j === false ? $n : $j; $cur .= substr($s, $i, $j - $i); $i = $j; continue; }
        if ($c === '/' && ($s[$i + 1] ?? '') === '*') { $j = strpos($s, '*/', $i + 2); $j = $j === false ? $n : $j + 2; $cur .= substr($s, $i, $j - $i); $i = $j; continue; }
        if ($c === "'" || $c === '"' || $c === '`' || $c === '[') {
            $close = $c === '[' ? ']' : $c; $j = $i + 1;
            while ($j < $n) { if ($s[$j] === $close) { if ($close !== ']' && ($s[$j + 1] ?? '') === $close) { $j += 2; continue; } break; } $j++; }
            $cur .= substr($s, $i, $j - $i + 1); $i = $j + 1; continue;
        }
        if ($c === ';') {
            $t = trim($cur);
            if (!$depthTrigger && preg_match('/^CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER\b/i', $t)) $depthTrigger = true;
            if ($depthTrigger && !preg_match('/\bEND\s*$/i', $t)) { $cur .= ';'; $i++; continue; }
            $depthTrigger = false;
            if ($t !== '') $out[] = $t;
            $cur = ''; $i++; continue;
        }
        $cur .= $c; $i++;
    }
    $t = trim($cur);
    if ($t !== '' && !preg_match('/^(--[^\n]*\n?\s*|\/\*.*?\*\/\s*)*$/s', $t)) $out[] = $t;
    return $out;
}

/** 오류를 한국어로 풀어 줍니다. 원래 문구도 함께 둡니다. */
function ko_error(string $msg): string {
    $map = [
        '/not authorized/' => fn($m) => '이 칸에서는 쓸 수 없는 명령입니다.',
        '/no such table: ([^\s,]+)/' => fn($m) => "'{$m[1]}'라는 테이블이 없습니다. 테이블 이름을 확인하세요.",
        '/no such column: ([^\s,]+)/' => fn($m) => "'{$m[1]}'라는 열이 없습니다. 열 이름을 확인하세요.",
        '/near "([^"]*)": syntax error/' => fn($m) => "'{$m[1]}' 근처의 문법이 틀렸습니다. 쉼표, 따옴표, 괄호를 확인하세요.",
        '/incomplete input/' => fn($m) => 'SQL이 끝나지 않았습니다. 괄호나 따옴표가 닫혔는지 보세요.',
        '/UNIQUE constraint failed/' => fn($m) => '이미 같은 값이 있어 넣을 수 없습니다(UNIQUE 제약).',
        '/NOT NULL constraint failed: (\S+)/' => fn($m) => "'{$m[1]}'은 비워 둘 수 없는 열입니다(NOT NULL 제약).",
        '/FOREIGN KEY constraint failed/' => fn($m) => '다른 테이블에 없는 번호를 가리키고 있습니다(외래 키 제약).',
        '/table (\S+) already exists/' => fn($m) => "'{$m[1]}' 테이블이 이미 있습니다. 다시 만들려면 DROP TABLE을 먼저 하세요.",
        '/database or disk is full/' => fn($m) => '내 DB가 정해진 크기(20MB)를 넘었습니다.',
        '/readonly database/' => fn($m) => '이 DB는 읽기만 할 수 있습니다.',
        '/datatype mismatch/' => fn($m) => '열의 자료형과 맞지 않는 값입니다.',
        '/misuse of aggregate/' => fn($m) => 'COUNT, SUM 같은 집계 함수는 WHERE에 쓸 수 없습니다. HAVING을 쓰세요.',
        '/ambiguous column name: (\S+)/' => fn($m) => "'{$m[1]}'이 여러 테이블에 있어 어느 것인지 모릅니다. 테이블이름.{$m[1]}처럼 쓰세요.",
    ];
    foreach ($map as $re => $fn) if (preg_match($re, $msg, $m)) return $fn($m) . ' (원래 문구: ' . $msg . ')';
    return $msg;
}

// ---------- DB 열기와 권한 ----------
const PRAGMA_OK = ['table_info', 'table_xinfo', 'table_list', 'index_list', 'index_info', 'foreign_key_list', 'foreign_keys'];
try {
    if ($mode === 'catalog' || $mode === 'check') {
        $db = new SQLite3($var . '/catalog.db', SQLITE3_OPEN_READONLY);
    } elseif ($mode === 'shared') {
        $db = new SQLite3($var . '/shared.db', SQLITE3_OPEN_READWRITE);
        $db->exec("ATTACH DATABASE " . "'" . SQLite3::escapeString($var . '/catalog.db') . "' AS cat");
    } elseif ($mode === 'mydb') {
        if (!preg_match('/^[a-z][a-z0-9]{2,11}$/', $user)) out(['ok' => false, 'error' => '아이디가 없습니다.']);
        $f = $var . '/mydb/' . $user . '.db';
        if (!is_file($f)) copy($var . '/catalog.db', $f);
        $db = new SQLite3($f, SQLITE3_OPEN_READWRITE);
        $db->exec('PRAGMA max_page_count = 5120; PRAGMA foreign_keys = ON;');   // 4KB × 5120 = 약 20MB
    } else {
        out(['ok' => false, 'error' => '모르는 실습입니다.']);
    }
    $db->busyTimeout(3000);
    $db->enableExceptions(false);
} catch (Throwable $e) {
    out(['ok' => false, 'error' => 'DB를 열지 못했습니다: ' . $e->getMessage()]);
}

$db->setAuthorizer(function (int $action, ...$a) use ($mode) {
    $read = [SQLite3::SELECT, SQLite3::READ, SQLite3::FUNCTION, SQLite3::RECURSIVE];
    if (in_array($action, $read, true)) {
        if ($action === SQLite3::FUNCTION && in_array(strtolower((string) ($a[1] ?? '')), ['load_extension', 'readfile', 'writefile', 'edit', 'fts3_tokenizer'], true)) return SQLite3::DENY;
        return SQLite3::OK;
    }
    if ($action === SQLite3::PRAGMA) {
        $p = strtolower((string) ($a[0] ?? ''));
        if (!in_array($p, PRAGMA_OK, true)) return SQLite3::DENY;
        if ($p === 'foreign_keys' && $a[1] !== null && $mode !== 'mydb') return SQLite3::DENY;
        return SQLite3::OK;
    }
    if (in_array($action, [SQLite3::ATTACH, SQLite3::DETACH], true)) return SQLite3::DENY;
    if ($mode === 'shared') {
        // 함께 쓰는 DB: reading_log에 넣기(INSERT)만 됩니다.
        if ($action === SQLite3::INSERT && strtolower((string) $a[0]) === 'reading_log' && ($a[2] ?? 'main') === 'main') return SQLite3::OK;
        return SQLite3::DENY;
    }
    if ($mode === 'mydb') {
        // 내 DB: 테이블 만들기, 고치기, 지우기 모두 됩니다(ATTACH와 위에서 막은 PRAGMA 빼고).
        return SQLite3::OK;
    }
    return SQLite3::DENY;
});

// ---------- 실행 ----------
if (preg_match('/^\s*\./m', $sql)) out(['ok' => false, 'error' => '점(.)으로 시작하는 명령(.tables, .import 등)은 sqlite3 프로그램의 명령이라 여기서는 쓸 수 없습니다. 테이블 목록은 SELECT name FROM sqlite_master; 로 보세요.']);
if (preg_match('/\bVACUUM\b/i', $sql)) out(['ok' => false, 'error' => 'VACUUM은 이 실습실에서 쓰지 않습니다.']);
$stmts = split_sql($sql);
if (!$stmts) out(['ok' => false, 'error' => 'SQL을 써 주세요.']);
if (count($stmts) > 30) out(['ok' => false, 'error' => '한 번에 30문장까지 실행합니다.']);

$results = [];
$maxBefore = 0;
if ($mode === 'shared') $maxBefore = (int) $db->querySingle('SELECT IFNULL(MAX(id),0) FROM reading_log');
foreach ($stmts as $s) {
    $t0 = microtime(true);
    $st = @$db->prepare($s);
    if ($st === false) {
        $results[] = ['sql' => $s, 'error' => ko_error($db->lastErrorMsg())];
        break;
    }
    $res = @$st->execute();
    if ($res === false) {
        $results[] = ['sql' => $s, 'error' => ko_error($db->lastErrorMsg())];
        break;
    }
    $cols = [];
    for ($i = 0; $i < $res->numColumns(); $i++) $cols[] = $res->columnName($i);
    $rows = []; $more = false;
    if ($cols) {
        while (($r = $res->fetchArray(SQLITE3_NUM)) !== false) {
            if (count($rows) >= MAX_ROWS) { $more = true; break; }
            $rows[] = $r;
        }
    }
    $results[] = ['sql' => $s, 'columns' => $cols, 'rows' => $rows, 'more' => $more,
        'changes' => $cols ? null : $db->changes(), 'ms' => round((microtime(true) - $t0) * 1000, 1)];
    $res->finalize();
}

if ($mode === 'shared') {
    // 누가 넣었는지는 서버가 채웁니다(다른 사람 이름으로 넣지 못하게).
    $db->setAuthorizer(null);
    $st = $db->prepare("UPDATE reading_log SET student = :u, created_at = COALESCE(created_at, datetime('now','localtime')) WHERE id > :m");
    $st->bindValue(':u', $user); $st->bindValue(':m', $maxBefore); $st->execute();
    $added = $db->changes();
    if ($added > 20) { $db->exec("DELETE FROM reading_log WHERE id > $maxBefore + 20"); }
}
out(['ok' => true, 'results' => $results]);
