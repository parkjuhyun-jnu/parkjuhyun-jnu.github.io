<?php
// 학생 실습실 공통 코드: 설정, 로그인, 실습실 DB(lab.db), 화면 머리와 꼬리.
// 이 폴더(lib)는 웹 루트(www) 바깥에 있어서 주소로는 열 수 없습니다.

declare(strict_types=1);
date_default_timezone_set('Asia/Seoul');

const LAB_ROOT = __DIR__ . '/..';
define('LAB_VAR', getenv('CLASS_LAB_VAR') ?: realpath(LAB_ROOT) . '/var');
const SITE_QUOTA = 50 * 1024 * 1024;      // 학생 한 명의 홈페이지 폴더 한도
const SITE_FILE_MAX = 20 * 1024 * 1024;   // 홈페이지에 올리는 파일 하나의 한도
const ARCHIVE_FILE_MAX = 100 * 1024 * 1024; // 아카이브에 올리는 파일 하나의 한도
const ARCHIVE_PER_STUDENT = 20;           // 학생 한 명이 아카이브에 넣을 수 있는 자료 수

function h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

function settings(): array {
    static $s = null;
    if ($s === null) {
        $f = LAB_VAR . '/settings.json';
        $s = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : [];
        $s += ['class_code' => '', 'teacher_code' => '', 'signup_open' => true, 'archive_open' => true, 'title' => '메타데이터와아카이빙연구 실습실'];
    }
    return $s;
}

function save_settings(array $new): void {
    $s = array_merge(settings(), $new);
    file_put_contents(LAB_VAR . '/settings.json', json_encode($s, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/** 실습실 운영 DB: 학생, 아카이브 자료, 보존 기록, 푼 문제, 방문 기록 */
function labdb(): SQLite3 {
    static $db = null;
    if ($db) return $db;
    $db = new SQLite3(LAB_VAR . '/lab.db');
    $db->busyTimeout(5000);
    $db->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    $db->exec(<<<SQL
CREATE TABLE IF NOT EXISTS student (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, pin_hash TEXT, created_at TEXT, last_seen TEXT);
CREATE TABLE IF NOT EXISTS solved (
  student_id TEXT, ex_id TEXT, at TEXT, PRIMARY KEY (student_id, ex_id));
CREATE TABLE IF NOT EXISTS visit (
  id INTEGER PRIMARY KEY, site TEXT, path TEXT, status INTEGER, bytes INTEGER, ip TEXT, agent TEXT, at TEXT);
CREATE INDEX IF NOT EXISTS visit_site ON visit(site, id);
CREATE TABLE IF NOT EXISTS item (
  id INTEGER PRIMARY KEY, owner TEXT, created_at TEXT, orig_name TEXT, stored TEXT, size INTEGER,
  sha256 TEXT, client_sha256 TEXT, mime TEXT, ext TEXT, kind TEXT, status TEXT, error TEXT,
  tech TEXT, dc TEXT, access TEXT, is_sample INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY, item_id INTEGER, at TEXT, type TEXT, outcome TEXT, detail TEXT, agent TEXT);
CREATE TABLE IF NOT EXISTS attempt (ip TEXT, at INTEGER);
SQL);
    return $db;
}

function now(): string { return date('Y-m-d H:i:s'); }

function q1(string $sql, array $p = []) {
    $st = labdb()->prepare($sql);
    foreach ($p as $k => $v) $st->bindValue(is_int($k) ? $k + 1 : $k, $v);
    $r = $st->execute()->fetchArray(SQLITE3_ASSOC);
    return $r ?: null;
}
function qall(string $sql, array $p = []): array {
    $st = labdb()->prepare($sql);
    foreach ($p as $k => $v) $st->bindValue(is_int($k) ? $k + 1 : $k, $v);
    $res = $st->execute(); $out = [];
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) $out[] = $r;
    return $out;
}
function qexec(string $sql, array $p = []): void {
    $st = labdb()->prepare($sql);
    foreach ($p as $k => $v) $st->bindValue(is_int($k) ? $k + 1 : $k, $v);
    $st->execute();
}

// ---------- 로그인 ----------
function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('classlab');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function me(): ?array {
    start_session();
    if (empty($_SESSION['sid'])) return null;
    if ($_SESSION['sid'] === 'teacher') return ['id' => 'teacher', 'name' => '교수', 'teacher' => true];
    $u = q1('SELECT id, name FROM student WHERE id = ?', [$_SESSION['sid']]);
    if (!$u) { unset($_SESSION['sid']); return null; }
    $u['teacher'] = false;
    return $u;
}
function require_login(): array {
    $u = me();
    if (!$u) { header('Location: ./'); exit; }
    return $u;
}
function csrf_field(): string { start_session(); return '<input type="hidden" name="csrf" value="' . h($_SESSION['csrf']) . '">'; }
function check_csrf(): void {
    start_session();
    $t = $_POST['csrf'] ?? ($_SERVER['HTTP_X_CSRF'] ?? '');
    if (!hash_equals($_SESSION['csrf'] ?? '', (string) $t)) { http_response_code(400); exit('요청이 만료되었습니다. 화면을 새로고침한 뒤 다시 해 주세요.'); }
}
function client_ip(): string { return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; }
function too_many_attempts(): bool {
    $t = time() - 600;
    qexec('DELETE FROM attempt WHERE at < ?', [$t]);
    $r = q1('SELECT COUNT(*) AS n FROM attempt WHERE ip = ?', [client_ip()]);
    return ($r['n'] ?? 0) >= 10;
}
function note_attempt(): void { qexec('INSERT INTO attempt (ip, at) VALUES (?, ?)', [client_ip(), time()]); }

/** 아이디 규칙: 영문 소문자로 시작, 영문 소문자와 숫자 3~12자. 주소(/u/아이디/)에 그대로 쓰입니다. */
function valid_id(string $id): bool { return (bool) preg_match('/^[a-z][a-z0-9]{2,11}$/', $id); }

// ---------- 화면 ----------
function page_head(string $title, ?array $u = null, string $here = ''): void {
    $nav = ['index.php' => '처음', 'home.php' => 'A 내 홈페이지', 'sql.php' => 'B SQL 실습실', 'archive.php' => 'C 우리 반 아카이브'];
    ?><!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($title) ?> | 실습실</title>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="lab.css">
</head>
<body class="lab">
<header class="labbar">
  <a class="brand" href="./">실습실</a>
  <?php if ($u): ?>
  <nav><?php foreach ($nav as $href => $label): ?><a href="<?= $href ?>"<?= $here === $href ? ' aria-current="page"' : '' ?>><?= h($label) ?></a><?php endforeach; ?>
    <?php if (!empty($u['teacher'])): ?><a href="teacher.php"<?= $here === 'teacher.php' ? ' aria-current="page"' : '' ?>>교수 화면</a><?php endif; ?></nav>
  <span class="who-am-i"><?= h($u['name']) ?><?= empty($u['teacher']) ? ' (' . h($u['id']) . ')' : '' ?>, <a href="logout.php">나가기</a></span>
  <?php endif; ?>
</header>
<main class="wide">
<?php
}

function page_foot(): void {
    ?>
  <footer>전남대학교 문헌정보학과 메타데이터와아카이빙연구 수업 실습실. 권장도서 목록 출처: (사)어린이도서연구회 ‘추천 목록’의 서지 사항(소개글은 싣지 않음).</footer>
</main>
<script>window.LAB_CSRF = <?= json_encode($_SESSION['csrf'] ?? '') ?>;</script>
</body>
</html>
<?php
}

function fmt_bytes($n): string {
    $n = (int) $n;
    if ($n >= 1048576) return number_format($n / 1048576, 1) . ' MB';
    if ($n >= 1024) return number_format($n / 1024, 1) . ' KB';
    return $n . ' B';
}

function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function server_base(): string {
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return 'http://' . $host;
}
