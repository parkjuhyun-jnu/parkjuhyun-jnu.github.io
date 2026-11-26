<?php
// 교수 화면: 학생 진도, 비밀번호 초기화, 학생 지우기, 입장과 올리기 열고 닫기, 함께 쓰는 DB 비우기,
// 문제 답 보기, 진도와 아카이브 메타데이터 CSV 내려받기.
require __DIR__ . '/../../lib/archive.php';
require __DIR__ . '/../../lib/sites.php';
require __DIR__ . '/../../lib/exercises.php';
$u = require_login();
if (!$u['teacher']) { header('Location: ./'); exit; }

function shared_db(): SQLite3 { $db = new SQLite3(LAB_VAR . '/shared.db'); $db->busyTimeout(5000); return $db; }

function delete_student(string $id): void {
    if (!valid_id($id)) return;
    foreach (qall('SELECT id FROM item WHERE owner = ?', [$id]) as $r) delete_item((int) $r['id']);
    rrmdir(site_dir($id));
    foreach (['', '-journal', '-wal', '-shm'] as $x) @unlink(LAB_VAR . "/mydb/$id.db$x");
    qexec('DELETE FROM solved WHERE student_id = ?', [$id]);
    qexec('DELETE FROM visit WHERE site = ?', [$id]);
    qexec('DELETE FROM student WHERE id = ?', [$id]);
    $db = shared_db(); $st = $db->prepare('DELETE FROM reading_log WHERE student = ?'); $st->bindValue(1, $id); $st->execute(); $db->close();
}

function csv_out(string $name, array $head, array $rows): void {
    header('Content-Type: text/csv; charset=utf-8');
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($name));
    $o = fopen('php://output', 'w');
    fwrite($o, "\xEF\xBB\xBF");   // 엑셀에서 한글이 깨지지 않게
    fputcsv($o, $head, ',', '"', '');
    foreach ($rows as $r) fputcsv($o, $r, ',', '"', '');
    exit;
}

$sets = array_keys(SQL_SETS);
$exByset = []; foreach ($sets as $k) $exByset[$k] = array_column(exercises_of($k), 'id');
$students = qall('SELECT s.*, (SELECT COUNT(*) FROM item WHERE owner = s.id) AS items,
    (SELECT COUNT(*) FROM visit WHERE site = s.id) AS visits FROM student s ORDER BY s.id');
$solved = [];
foreach (qall('SELECT student_id, ex_id FROM solved') as $r) $solved[$r['student_id']][$r['ex_id']] = true;
$need = ['title', 'creator', 'date', 'subject', 'description', 'rights'];
$meta = [];
foreach (qall('SELECT owner, dc FROM item') as $r) {
    $dc = json_decode((string) $r['dc'], true) ?: [];
    $ok = count(array_filter($need, fn($k) => trim((string) ($dc[$k] ?? '')) !== '')) === count($need);
    $meta[$r['owner']] = ($meta[$r['owner']] ?? 0) + ($ok ? 1 : 0);
}
// ---------- 내려받기 ----------
$export = $_GET['export'] ?? '';
if ($export === 'progress') {
    $head = ['아이디', '이름', '처음 들어온 때', '마지막으로 본 때', '홈페이지 용량(바이트)', '홈페이지 방문 수'];
    foreach ($sets as $k) $head[] = SQL_SETS[$k]['title'] . ' (' . count($exByset[$k]) . '문제)';
    array_push($head, '아카이브 자료 수', '메타데이터 다 단 자료 수', '푼 문제 번호');
    $rows = [];
    foreach ($students as $s) {
        $r = [$s['id'], $s['name'], $s['created_at'], $s['last_seen'], site_usage($s['id']), $s['visits']];
        foreach ($sets as $k) $r[] = count(array_filter($exByset[$k], fn($e) => isset($solved[$s['id']][$e])));
        array_push($r, $s['items'], $meta[$s['id']] ?? 0, implode(' ', array_keys($solved[$s['id']] ?? [])));
        $rows[] = $r;
    }
    csv_out('실습실_진도_' . date('Ymd') . '.csv', $head, $rows);
}
if ($export === 'archive') {
    $head = ['번호', '식별자', '올린 사람', '원래 파일 이름', '유형', 'MIME', '크기(바이트)', 'SHA-256', '올린 때', '상태', '문제'];
    foreach (DC_FIELDS as $k => $v) $head[] = "dc:$k ({$v[0]})";
    $rows = [];
    foreach (qall('SELECT * FROM item ORDER BY id') as $r) {
        $it = item((int) $r['id']);
        $row = [$r['id'], $it['dc']['identifier'] ?? item_ident((int) $r['id']), $r['owner'], $r['orig_name'], $r['kind'], $r['mime'], $r['size'], $r['sha256'], $r['created_at'], $r['status'], $r['error']];
        foreach (array_keys(DC_FIELDS) as $k) $row[] = $it['dc'][$k] ?? '';
        $rows[] = $row;
    }
    csv_out('우리반_아카이브_메타데이터_' . date('Ymd') . '.csv', $head, $rows);
}
if ($export === 'log') {
    $db = shared_db(); $res = $db->query('SELECT * FROM reading_log ORDER BY id'); $rows = [];
    while ($r = $res->fetchArray(SQLITE3_NUM)) $rows[] = $r;
    csv_out('함께쓰는DB_reading_log_' . date('Ymd') . '.csv', ['id', 'book_id', 'student', 'tag', 'note', 'created_at'], $rows);
}

// ---------- 바꾸기 ----------
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $act = $_POST['act'] ?? '';
    $sid = (string) ($_POST['sid'] ?? '');
    if ($act === 'toggle') {
        $k = $_POST['key'] ?? '';
        if (in_array($k, ['signup_open', 'archive_open'], true)) { save_settings([$k => empty(settings()[$k])]); }
    } elseif ($act === 'newcode') {
        $words = ['서가', '서고', '목록', '색인', '청구', '열람', '별치', '장서', '고서', '사서', '대출', '반납', '분류', '주제', '저록'];
        save_settings(['class_code' => $words[random_int(0, count($words) - 1)] . random_int(100, 999)]);
        $msg = '학생 입장 코드를 바꿨습니다. 이미 들어와 있는 학생은 그대로 씁니다.';
    } elseif ($act === 'pin' && q1('SELECT id FROM student WHERE id = ?', [$sid])) {
        qexec('UPDATE student SET pin_hash = NULL WHERE id = ?', [$sid]);
        $msg = "$sid 학생의 비밀번호를 지웠습니다. 다음에 들어올 때 넣는 네 자리가 새 비밀번호가 됩니다.";
    } elseif ($act === 'delete' && q1('SELECT id FROM student WHERE id = ?', [$sid])) {
        if (($_POST['confirm'] ?? '') === $sid) { delete_student($sid); $msg = "$sid 학생과 그 학생의 홈페이지, 내 DB, 아카이브 자료, 기록을 모두 지웠습니다."; }
        else $msg = '지우려면 확인 칸에 아이디를 똑같이 적어야 합니다.';
    } elseif ($act === 'clearlog') {
        if (($_POST['confirm'] ?? '') === '비우기') { $db = shared_db(); $db->exec('DELETE FROM reading_log'); $db->close(); qexec("DELETE FROM solved WHERE ex_id LIKE 's%'"); $msg = '함께 쓰는 DB(reading_log)를 비웠습니다.'; }
        else $msg = "비우려면 확인 칸에 '비우기'라고 적으세요.";
    }
    $_SESSION['flash'] = $msg;
    header('Location: teacher.php'); exit;
}
$msg = $_SESSION['flash'] ?? ''; unset($_SESSION['flash']);
$s = settings();
$db = shared_db(); $logN = (int) $db->querySingle('SELECT COUNT(*) FROM reading_log'); $db->close();
$itemsN = (int) (q1('SELECT COUNT(*) AS n FROM item')['n'] ?? 0);
$du = 0; foreach (['sites', 'mydb', 'archive', 'backup'] as $d) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(LAB_VAR . "/$d", FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) $du += $f->getSize();
}
$free = @disk_free_space(LAB_VAR);

page_head('교수 화면', $u, 'teacher.php');
?>
  <span class="step">교수 화면</span>
  <h1>실습실 관리</h1>
  <?php if ($msg): ?><div class="notice"><?= h($msg) ?></div><?php endif; ?>

  <div class="cols">
    <div class="card">
      <b>입장</b>
      <p>학생 입장 코드: <code style="font-size:1.3rem"><?= h($s['class_code']) ?></code></p>
      <form method="post" class="inline"><?= csrf_field() ?><input type="hidden" name="act" value="newcode"><button>입장 코드 바꾸기</button></form>
      <form method="post" class="inline"><?= csrf_field() ?><input type="hidden" name="act" value="toggle"><input type="hidden" name="key" value="signup_open">
        <button><?= $s['signup_open'] ? '새 학생 받기 닫기' : '새 학생 받기 열기' ?></button></form>
      <p class="muted">새 학생 받기: <b><?= $s['signup_open'] ? '열림' : '닫힘' ?></b>. 닫아도 이미 들어온 학생은 들어올 수 있습니다. 교수 코드는 서버에서만 바꿉니다(설치 안내 참고).</p>
    </div>
    <div class="card">
      <b>아카이브와 저장 공간</b>
      <p>자료 올리기: <b><?= $s['archive_open'] ? '열림' : '닫힘' ?></b>
        <form method="post" class="inline"><?= csrf_field() ?><input type="hidden" name="act" value="toggle"><input type="hidden" name="key" value="archive_open">
        <button><?= $s['archive_open'] ? '올리기 닫기' : '올리기 열기' ?></button></form></p>
      <p>학생 자료가 쓰는 공간 <?= fmt_bytes($du) ?><?= $free !== false ? ', 서버 디스크 남은 공간 ' . fmt_bytes($free) : '' ?>. 아카이브 자료 <?= $itemsN ?>건.</p>
      <p><a class="btn" href="?export=archive">아카이브 메타데이터 CSV</a> <a class="btn" href="archive.php">아카이브 목록 보기</a></p>
    </div>
  </div>

  <h2>학생 <?= count($students) ?>명</h2>
  <p><a class="btn" href="?export=progress">진도 CSV 내려받기</a> <span class="muted">엑셀에서 바로 열립니다(UTF-8).</span></p>
  <div style="overflow:auto"><table class="grid">
    <thead><tr><th>아이디</th><th>이름</th><th>마지막으로 본 때</th><th>A 홈페이지</th>
      <?php foreach ($sets as $k): ?><th><?= h(explode(' ', SQL_SETS[$k]['title'])[0]) ?></th><?php endforeach; ?>
      <th>C 자료(메타데이터 다 단 것)</th><th>관리</th></tr></thead>
    <tbody>
    <?php foreach ($students as $st): $id = $st['id']; ?>
      <tr>
        <td><a href="/u/<?= h($id) ?>/" target="_blank"><?= h($id) ?></a></td>
        <td><?= h($st['name']) ?><?= $st['pin_hash'] === null ? ' <span class="badge warn">비밀번호 초기화됨</span>' : '' ?></td>
        <td><small><?= h($st['last_seen'] ?? '') ?></small></td>
        <td><?= fmt_bytes(site_usage($id)) ?>, 방문 <?= (int) $st['visits'] ?></td>
        <?php foreach ($sets as $k): $n = count(array_filter($exByset[$k], fn($e) => isset($solved[$id][$e]))); ?>
          <td><span class="badge <?= $n === count($exByset[$k]) ? 'ok' : ($n ? 'warn' : '') ?>"><?= $n ?>/<?= count($exByset[$k]) ?></span></td>
        <?php endforeach; ?>
        <td><?= (int) $st['items'] ?>건 (<?= (int) ($meta[$id] ?? 0) ?>)</td>
        <td>
          <form method="post" class="inline" onsubmit="return confirm('<?= h($id) ?> 학생의 비밀번호를 지울까요?')"><?= csrf_field() ?><input type="hidden" name="act" value="pin"><input type="hidden" name="sid" value="<?= h($id) ?>"><button>비밀번호 초기화</button></form>
          <details style="display:inline-block"><summary>지우기</summary>
            <form method="post"><?= csrf_field() ?><input type="hidden" name="act" value="delete"><input type="hidden" name="sid" value="<?= h($id) ?>">
              <small>홈페이지, 내 DB, 아카이브 자료, 함께 쓰는 DB 기록까지 모두 지웁니다. 되돌릴 수 없습니다. 확인을 위해 아이디를 적으세요.</small><br>
              <input name="confirm" size="10" placeholder="<?= h($id) ?>"> <button class="danger">학생 지우기</button></form></details>
        </td>
      </tr>
    <?php endforeach; ?>
    <?php if (!$students): ?><tr><td colspan="<?= 6 + count($sets) ?>" class="muted">아직 들어온 학생이 없습니다.</td></tr><?php endif; ?>
    </tbody>
  </table></div>

  <h2>함께 쓰는 DB (B3)</h2>
  <p>reading_log에 기록 <?= $logN ?>건. <a class="btn" href="?export=log">CSV 내려받기</a></p>
  <form method="post" class="row"><?= csrf_field() ?><input type="hidden" name="act" value="clearlog">
    <input name="confirm" placeholder="비우기" size="8"> <button class="danger">기록을 모두 지우고 새로 시작</button>
    <span class="muted">새 학기나 다른 반 수업 전에 씁니다. B3의 '푼 문제' 표시도 함께 지웁니다.</span></form>

  <h2>B 문제와 채점 기준</h2>
  <p class="muted">학생 화면에는 나오지 않습니다. 결과 비교형은 학생 결과가 아래 SQL 가운데 하나의 결과와 같으면 정답, 상태 확인형은 아래 SQL이 1을 돌려주면 완료입니다.</p>
  <?php foreach (SQL_SETS as $k => $set): ?>
  <details><summary><b><?= h($set['title']) ?></b> (<?= count($exByset[$k]) ?>문제)</summary>
    <ol class="tasks">
    <?php foreach (exercises_of($k) as $e): ?>
      <li><b><?= h($e['id']) ?></b> <?= h($e['ask']) ?>
        <pre><?= h(isset($e['check']) ? "-- 상태 확인\n" . $e['check'] : implode("\n-- 또는\n", $e['answer'])) ?></pre></li>
    <?php endforeach; ?>
    </ol></details>
  <?php endforeach; ?>

  <h2>서버에서 하는 일</h2>
  <p class="muted">가비아 콘솔의 [서버 접속] 창이나 WinSCP 터미널에서 실행합니다.</p>
  <pre>sudo -u www-data php /srv/class-lab/setup/lab-init.php --codes    # 입장 코드와 교수 코드를 새로 만들기
sudo systemctl restart class-lab                                   # 실습실 다시 켜기
sudo bash /srv/class-lab/setup/check.sh                            # 서버 상태 보기</pre>
<?php page_foot();
