<?php
// 설치 뒤 자체 점검: 서버 안에서 학생 실습실이 제대로 도는지 봅니다.
// 학생 자료는 건드리지 않고, 점검에 쓴 자료(올린 사람 'selftest')는 끝에 지웁니다. 비밀번호나 코드는 출력하지 않습니다.
// 실행: sudo -u www-data php /srv/class-lab/setup/selftest.php        (문 번호가 8080이 아니면 끝에 번호를 붙임)
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit;
require __DIR__ . '/../lib/archive.php';
require __DIR__ . '/../lib/sqlrun.php';

$port = (int) ($argv[1] ?? 8080);
$pass = 0; $fail = 0;
function check(string $what, bool $ok, string $detail = ''): void {
    global $pass, $fail;
    $ok ? $pass++ : $fail++;
    echo ($ok ? '  [통과] ' : '  [문제] ') . $what . ($detail !== '' ? "  ($detail)" : '') . "\n";
}
function first_cell(array $r) { return $r['results'][0]['rows'][0][0] ?? null; }
function first_error(array $r): string { return (string) ($r['error'] ?? ($r['results'][0]['error'] ?? '')); }

echo "== 1. PHP와 도구\n";
check('PHP 8.1 이상', PHP_VERSION_ID >= 80100, PHP_VERSION);
foreach (['sqlite3', 'mbstring', 'fileinfo', 'zip'] as $e) check("PHP 확장 $e", extension_loaded($e));
check('SQLite 권한 검사(setAuthorizer)', method_exists('SQLite3', 'setAuthorizer'));
foreach (['ffmpeg', 'ffprobe', 'exiftool', 'heif-convert', 'timeout', 'nice'] as $t) check("도구 $t", has_tool($t));
check('학생 자료 폴더에 쓸 수 있음', is_writable(LAB_VAR), LAB_VAR);
check('수업 코드가 있음', settings()['class_code'] !== '' && settings()['teacher_code'] !== '');

echo "== 2. 웹 서버 (localhost:$port)\n";
$get = function (string $path) use ($port): array {
    $ctx = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 10, 'follow_location' => 0]]);
    $body = @file_get_contents("http://127.0.0.1:$port$path", false, $ctx);
    $code = isset($http_response_header[0]) && preg_match('/ (\d{3})/', $http_response_header[0], $m) ? (int) $m[1] : 0;
    return [$code, (string) $body];
};
[$c, $b] = $get('/'); check('시연 첫 화면', $c === 200 && strpos($b, 'lab/') !== false, "상태 $c");
[$c, $b] = $get('/lab/'); check('학생 실습실 들어가기 화면', $c === 200 && strpos($b, '수업 코드') !== false, "상태 $c");
[$c, $b] = $get('/u/nobody999/'); check('없는 학생 주소는 404', $c === 404, "상태 $c");
[$c, $b] = $get('/lab/teacher.php'); check('로그인 없이 교수 화면은 막힘', $c === 302 || ($c === 200 && strpos($b, '수업 코드') !== false), "상태 $c");
[$c, $b] = $get('/router.php'); check('길잡이 파일은 열리지 않음', $c === 404, "상태 $c");

echo "== 3. B SQL 실습실\n";
$r = run_sql('catalog', 'SELECT COUNT(*) FROM book');
check('목록 DB 읽기', first_cell($r) === 2175, 'book ' . var_export(first_cell($r), true) . '권');
$r = run_sql('catalog', 'DELETE FROM book');
check('목록 DB 고치기는 거절', first_error($r) !== '', first_error($r));
$r = run_sql('catalog', "ATTACH '/etc/passwd' AS x");
check('다른 파일 붙이기(ATTACH)는 거절', first_error($r) !== '');
$t0 = microtime(true);
$r = run_sql('catalog', 'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n) SELECT COUNT(*) FROM n');
$sec = round(microtime(true) - $t0, 1);
check('끝나지 않는 SQL은 5초 뒤 멈춤', empty($r['ok']) && $sec < 9, "{$sec}초");
$r = run_sql('mydb', "CREATE TABLE selftest_t (a); INSERT INTO selftest_t VALUES (1); SELECT COUNT(*) FROM selftest_t", 'selftest');
check('내 DB 만들고 고치기', ($r['results'][2]['rows'][0][0] ?? null) === 1, first_error($r));
foreach (['', '-journal', '-wal', '-shm'] as $x) @unlink(LAB_VAR . "/mydb/selftest.db$x");

echo "== 4. C 아카이빙 (뒤에서 처리하는 데 1분쯤 걸립니다)\n";
$me = ['id' => 'selftest', 'name' => '자체 점검', 'teacher' => true];
$src = realpath(__DIR__ . '/../samples');
$files = ['library-shelf.jpg', 'cover-scan.jpg', 'broken-photo.jpg', 'book-talk.wav'];
if (is_file(LAB_VAR . '/samples/library-tour.mp4')) $files[] = LAB_VAR . '/samples/library-tour.mp4';
else check('보기 영상 library-tour.mp4', false, 'var/samples에 없음. ffmpeg를 설치한 뒤 install.sh를 다시 실행하세요.');
$ids = [];
foreach ($files as $f) {
    $path = $f[0] === '/' ? $f : "$src/$f";
    $tmp = LAB_VAR . '/tmp/selftest-' . basename($path);
    copy($path, $tmp);
    [$id, $err] = ingest($me, ['name' => basename($path), 'tmp_name' => $tmp, 'size' => filesize($tmp), 'error' => UPLOAD_ERR_OK], hash_file('sha256', $tmp));
    @unlink($tmp);
    if (!$id) { check('받기 ' . basename($path), false, $err); continue; }
    $ids[basename($path)] = $id;
}
$deadline = time() + 240;
do {
    sleep(2);
    $left = array_filter($ids, fn($id) => (item($id)['status'] ?? '') !== 'done');
} while ($left && time() < $deadline);
check('뒤에서 처리하기(nohup) 끝남', !$left, $left ? '아직 처리 중: ' . implode(', ', array_keys($left)) : count($ids) . '건');

$ev = function (int $id, string $type): string {
    foreach (events($id) as $e) if (strpos($e['type'], $type) === 0) return $e['outcome'];
    return '(없음)';
};
foreach ($ids as $name => $id) {
    $it = item($id);
    $sum = $it['tech']['summary'] ?? [];
    $acc = array_filter($it['access'] ?? []);
    echo "  - $name: 전송 고정성 " . $ev($id, '전송 고정성') . ', 형식 식별 ' . $ev($id, '형식 식별') . ', 기술 메타데이터 ' . $ev($id, '기술 메타데이터')
        . ', 이용본 ' . $ev($id, '이용본') . ($acc ? ' (' . implode(', ', $acc) . ')' : '') . ', 뽑은 항목 ' . count($sum) . "개\n";
}
if (isset($ids['library-shelf.jpg'])) {
    $id = $ids['library-shelf.jpg']; $it = item($id); $sum = $it['tech']['summary'] ?? [];
    check('사진: 카메라와 위치를 뽑음', isset($sum['카메라 모델'], $sum['위도']), ($sum['카메라 모델'] ?? '-') . ', 위도 ' . ($sum['위도'] ?? '-'));
    check('사진: 이용본과 썸네일', is_file(arch_dir($id) . '/access.jpg') && is_file(arch_dir($id) . '/thumb.jpg'));
    $gps = trim((string) shell_exec('exiftool -s3 -GPSLatitude ' . escapeshellarg(arch_dir($id) . '/access.jpg') . ' 2>/dev/null'));
    check('사진: 이용본에서 위치가 지워짐', is_file(arch_dir($id) . '/access.jpg') && $gps === '', $gps === '' ? '' : "남은 값 $gps");
    flip_bit($it, 'selftest'); $r = fixity_check($it, 'selftest');
    check('손상 연습 뒤 고정성 검사가 원본 불일치를 찾음', !$r['원본']['ok'] && $r['사본']['ok']);
    repair($it, 'selftest'); $r = fixity_check($it, 'selftest');
    check('사본으로 되살린 뒤 모두 일치', $r['원본']['ok'] && $r['사본']['ok']);
    $bag = make_bag(item($id));
    $z = new ZipArchive(); $okz = is_file($bag) && $z->open($bag) === true;
    $names = []; if ($okz) { for ($i = 0; $i < $z->numFiles; $i++) $names[] = $z->getNameIndex($i); $z->close(); }
    check('BagIt 꾸러미', $okz && (bool) preg_grep('/manifest-sha256\.txt$/', $names), count($names) . '개 파일');
    @unlink($bag);
}
if (isset($ids['cover-scan.jpg'])) check('이름만 바꾼 파일: 형식 경고', $ev($ids['cover-scan.jpg'], '형식 식별') === '경고');
if (isset($ids['book-talk.wav'])) {
    $id = $ids['book-talk.wav'];
    check('소리: MP3 이용본과 파형', is_file(arch_dir($id) . '/access.mp3') && is_file(arch_dir($id) . '/thumb.png'), (item($id)['tech']['summary']['표본 추출률(Hz)'] ?? '-') . 'Hz');
}
if (isset($ids['library-tour.mp4'])) {
    $id = $ids['library-tour.mp4']; $s = item($id)['tech']['summary'] ?? [];
    check('영상: 코덱과 길이를 뽑고 MP4 이용본', is_file(arch_dir($id) . '/access.mp4') && isset($s['영상 코덱']), ($s['영상 코덱'] ?? '-') . ', ' . ($s['길이(초)'] ?? '-') . '초');
}
if (isset($ids['broken-photo.jpg'])) echo '  - 깨진 사진의 이용본: ' . $ev($ids['broken-photo.jpg'], '이용본') . " (성공이면 아래쪽이 비어 있는 그림, 실패면 만들지 못한 것. 둘 다 수업에 씀)\n";

foreach ($ids as $id) delete_item($id);
echo "== 점검에 쓴 자료를 지웠습니다.\n";
echo "\n결과: 통과 $pass, 문제 $fail\n";
exit($fail ? 1 : 0);
