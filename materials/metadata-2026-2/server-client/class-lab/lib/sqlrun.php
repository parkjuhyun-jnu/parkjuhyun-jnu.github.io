<?php
// 학생 SQL을 따로 떨어진 프로그램(sqlworker.php)에서 실행하고, 오래 걸리면 끕니다.
declare(strict_types=1);
require_once __DIR__ . '/app.php';

const SQL_TIMEOUT = 5.0;   // 초

function run_sql(string $mode, string $sql, string $user = ''): array {
    // 입력과 출력은 임시 파일로 주고받습니다(파이프는 Windows에서 기다리다 멈출 수 있어서).
    $tmp = LAB_VAR . '/tmp';
    if (!is_dir($tmp)) @mkdir($tmp, 0775, true);
    $key = $tmp . '/sql-' . bin2hex(random_bytes(6));
    file_put_contents("$key.in", json_encode(['mode' => $mode, 'sql' => $sql, 'user' => $user, 'var' => LAB_VAR], JSON_UNESCAPED_UNICODE));
    $cmd = [PHP_BINARY, '-d', 'display_errors=stderr', __DIR__ . '/sqlworker.php'];
    $p = proc_open($cmd, [0 => ['file', "$key.in", 'r'], 1 => ['file', "$key.out", 'w'], 2 => ['file', "$key.err", 'w']], $pipes);
    if (!is_resource($p)) { @unlink("$key.in"); return ['ok' => false, 'error' => 'SQL 실행기를 띄우지 못했습니다.']; }
    $t0 = microtime(true); $timedOut = false;
    while (proc_get_status($p)['running']) {
        if (microtime(true) - $t0 > SQL_TIMEOUT) { $timedOut = true; proc_terminate($p, 9); break; }
        usleep(15000);
    }
    proc_close($p);
    $out = (string) @file_get_contents("$key.out"); $err = (string) @file_get_contents("$key.err");
    foreach (['in', 'out', 'err'] as $x) @unlink("$key.$x");
    if ($timedOut) {
        return ['ok' => false, 'error' => SQL_TIMEOUT . '초 안에 끝나지 않아 멈췄습니다. 조건(WHERE)이나 JOIN의 짝 맞추기(ON)를 빠뜨리지 않았는지 보세요.'];
    }
    $j = json_decode($out, true);
    if (!is_array($j)) return ['ok' => false, 'error' => '실행기가 답을 주지 못했습니다. ' . trim(strip_tags($err ?: $out))];
    return $j;
}

/** 마지막 결과 표만 꺼냅니다(채점용). */
function last_table(array $r): ?array {
    if (empty($r['ok'])) return null;
    $res = $r['results'];
    for ($i = count($res) - 1; $i >= 0; $i--) {
        if (!empty($res[$i]['error'])) return null;
        if (!empty($res[$i]['columns'])) return $res[$i];
    }
    return null;
}

/** 두 결과 표가 같은지: 열 이름은 보지 않고 값만, 순서가 중요할 때만 순서까지 봅니다. */
function same_table(array $a, array $b, bool $ordered): bool {
    if (count($a['columns']) !== count($b['columns'])) return false;
    $norm = function ($rows) {
        return array_map(fn($r) => json_encode(array_map(fn($v) => is_float($v) ? round($v, 2) : (is_int($v) ? (string) $v : (is_null($v) ? null : (is_numeric($v) && (string) (int) $v === (string) $v ? (string) $v : $v))), $r), JSON_UNESCAPED_UNICODE), $rows);
    };
    $x = $norm($a['rows']); $y = $norm($b['rows']);
    if (!empty($a['more']) || !empty($b['more'])) return false;
    if (!$ordered) { sort($x); sort($y); }
    return $x === $y;
}
