<?php
// 실습실의 JSON API. 화면의 자바스크립트가 부릅니다.
require __DIR__ . '/../../lib/sqlrun.php';
require __DIR__ . '/../../lib/exercises.php';
$u = me();
if (!$u) json_out(['ok' => false, 'error' => '로그인이 끊겼습니다. 새로고침해 주세요.'], 401);
$action = $_GET['action'] ?? '';
$uid = $u['teacher'] ? '' : $u['id'];

if ($action === 'books') {
    $q = trim((string) ($_GET['q'] ?? ''));
    $db = new SQLite3(LAB_VAR . '/catalog.db', SQLITE3_OPEN_READONLY);
    $st = $db->prepare("SELECT id, title, author, publisher, pub_year, age, genre FROM book WHERE title LIKE :q OR author LIKE :q ORDER BY title LIMIT 20");
    $st->bindValue(':q', '%' . $q . '%');
    $r = $st->execute(); $out = [];
    while ($b = $r->fetchArray(SQLITE3_ASSOC)) $out[] = $b;
    json_out(['ok' => true, 'books' => $out]);
}

if ($action === 'schema') {
    $set = $_GET['set'] ?? 'catalog';
    $mode = SQL_SETS[$set]['mode'] ?? 'catalog';
    if ($mode === 'mydb' && !$uid) json_out(['ok' => false, 'error' => '학생만 씁니다.']);
    // 테이블 목록을 먼저 받고, 테이블마다 PRAGMA table_info로 칸을 봅니다.
    $list = $mode === 'shared'
        ? "SELECT 'main', name FROM sqlite_master WHERE type = 'table' UNION ALL SELECT 'cat', name FROM cat.sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'"
        : "SELECT 'main', name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name";
    $names = run_sql($mode, $list, $uid)['results'][0]['rows'] ?? [];
    $tables = [];
    if ($names) {
        $q = implode(";
", array_map(fn($n) => 'PRAGMA ' . $n[0] . '.table_info("' . str_replace('"', '""', $n[1]) . '")', $names));
        $r = run_sql($mode, $q, $uid);
        foreach ($names as $i => $n) {
            foreach (($r['results'][$i]['rows'] ?? []) as $c) $tables[$n[1]][] = $c[1] . ($c[2] ? ' ' . $c[2] : '');
        }
    }
    json_out(['ok' => true, 'tables' => $tables]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'POST로 보내 주세요.'], 405);
check_csrf();

if ($action === 'sql') {
    $set = $_POST['set'] ?? 'catalog';
    $mode = SQL_SETS[$set]['mode'] ?? 'catalog';
    if ($mode !== 'catalog' && !$uid) json_out(['ok' => false, 'error' => '교수 화면에서는 B1, B2만 실행합니다.']);
    $sql = (string) ($_POST['sql'] ?? '');
    if (strlen($sql) > 20000) json_out(['ok' => false, 'error' => 'SQL이 너무 깁니다.']);
    json_out(run_sql($mode, $sql, $uid));
}

if ($action === 'check') {
    $ex = exercise((string) ($_POST['ex'] ?? ''));
    if (!$ex) json_out(['ok' => false, 'error' => '모르는 문제입니다.']);
    if (!$uid) json_out(['ok' => false, 'error' => '학생으로 들어와야 채점합니다.']);
    $mode = SQL_SETS[$ex['set']]['mode'];
    $pass = false; $why = '';
    if (isset($ex['check'])) {
        if ($mode === 'mydb') {
            $f = LAB_VAR . "/mydb/$uid.db";
            if (!is_file($f)) json_out(['ok' => true, 'pass' => false, 'why' => '아직 내 DB를 쓰지 않았습니다.']);
            $db = new SQLite3($f, SQLITE3_OPEN_READONLY);
        } else {
            $db = new SQLite3(LAB_VAR . '/shared.db', SQLITE3_OPEN_READONLY);
            $db->exec("ATTACH DATABASE '" . SQLite3::escapeString(LAB_VAR . '/catalog.db') . "' AS cat");
        }
        $db->enableExceptions(false);
        $st = @$db->prepare($ex['check']);
        if ($st) { if (strpos($ex['check'], ':user') !== false) $st->bindValue(':user', $uid); $r = @$st->execute(); $pass = $r && (int) ($r->fetchArray(SQLITE3_NUM)[0] ?? 0) === 1; }
        $why = $pass ? '' : '아직 조건에 맞지 않습니다. 문제를 다시 읽고, 결과를 SELECT로 확인해 보세요.';
    } else {
        $sql = (string) ($_POST['sql'] ?? '');
        $mine = run_sql($mode, $sql, $uid);
        $t = last_table($mine);
        if (!$t) { $why = empty($mine['ok']) ? ($mine['error'] ?? '실행하지 못했습니다.') : ''; foreach (($mine['results'] ?? []) as $r) if (!empty($r['error'])) $why = $r['error']; $why = $why ?: '결과 표가 나오는 SELECT를 써 주세요.'; }
        else {
            foreach ($ex['answer'] as $ans) {
                $a = last_table(run_sql($mode === 'shared' ? 'shared' : 'catalog', $ans, $uid));
                if ($a && same_table($t, $a, !empty($ex['ordered']))) { $pass = true; break; }
                if ($a && !$why) {
                    if (count($t['columns']) !== count($a['columns'])) $why = '결과의 칸 수가 다릅니다(정답은 ' . count($a['columns']) . '칸). 문제에서 보이라는 칸만 SELECT 하세요.';
                    elseif (count($t['rows']) !== count($a['rows'])) $why = '결과의 줄 수가 다릅니다(내 결과 ' . count($t['rows']) . '줄). 조건(WHERE)을 다시 보세요.';
                    elseif (!empty($ex['ordered'])) $why = '값이나 순서가 다릅니다. ORDER BY를 확인하세요.';
                    else $why = '값이 다릅니다. 조건과 계산을 다시 보세요.';
                }
            }
        }
    }
    if ($pass) $why = '';
    if ($pass) qexec('INSERT OR IGNORE INTO solved (student_id, ex_id, at) VALUES (?,?,?)', [$uid, $ex['id'], now()]);
    json_out(['ok' => true, 'pass' => $pass, 'why' => $why]);
}

if ($action === 'mydb_reset') {
    if (!$uid) json_out(['ok' => false]);
    @unlink(LAB_VAR . "/mydb/$uid.db");
    @unlink(LAB_VAR . "/mydb/$uid.db-journal");
    qexec("DELETE FROM solved WHERE student_id = ? AND ex_id LIKE 'm%'", [$uid]);
    json_out(['ok' => true]);
}

if ($action === 'mylog_delete') {
    if (!$uid) json_out(['ok' => false]);
    $db = new SQLite3(LAB_VAR . '/shared.db');
    $st = $db->prepare('DELETE FROM reading_log WHERE student = ? AND id = ?');
    $st->bindValue(1, $uid); $st->bindValue(2, (int) ($_POST['id'] ?? 0)); $st->execute();
    json_out(['ok' => true, 'deleted' => $db->changes()]);
}

json_out(['ok' => false, 'error' => '모르는 요청입니다.'], 404);
