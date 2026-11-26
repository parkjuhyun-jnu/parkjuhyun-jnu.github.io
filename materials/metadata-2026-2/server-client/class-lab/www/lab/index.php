<?php
// 실습실 입구: 들어가기(수업 코드, 아이디, 비밀번호)와 처음 화면.
require __DIR__ . '/../../lib/sites.php';
start_session();
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $s = settings();
    if (too_many_attempts()) {
        $err = '잘못 넣은 횟수가 많아 10분 동안 들어갈 수 없습니다. 잠시 뒤에 다시 해 주세요.';
    } elseif (($_POST['who'] ?? '') === 'teacher') {
        if ($s['teacher_code'] !== '' && hash_equals($s['teacher_code'], trim((string) ($_POST['tcode'] ?? '')))) {
            session_regenerate_id(true);
            $_SESSION['sid'] = 'teacher';
            header('Location: teacher.php'); exit;
        }
        note_attempt(); $err = '교수 코드가 맞지 않습니다.';
    } else {
        $code = trim((string) ($_POST['code'] ?? ''));
        $id = strtolower(trim((string) ($_POST['id'] ?? '')));
        $pin = trim((string) ($_POST['pin'] ?? ''));
        $name = trim((string) preg_replace('/\s+/u', ' ', (string) ($_POST['name'] ?? '')));
        if ($s['class_code'] === '' || !hash_equals($s['class_code'], $code)) { note_attempt(); $err = '수업 코드가 맞지 않습니다. 칠판(화면)에 있는 코드를 다시 보세요.'; }
        elseif (!valid_id($id)) $err = '아이디는 영문 소문자로 시작하고, 영문 소문자와 숫자로 3~12자입니다(예: jhpark, reader07). 이 아이디가 내 홈페이지 주소가 됩니다.';
        elseif (!preg_match('/^\d{4}$/', $pin)) $err = '비밀번호는 숫자 네 자리입니다.';
        else {
            $u = q1('SELECT * FROM student WHERE id = ?', [$id]);
            if ($u) {
                if ($u['pin_hash'] === null || $u['pin_hash'] === '') {
                    qexec('UPDATE student SET pin_hash = ? WHERE id = ?', [password_hash($pin, PASSWORD_DEFAULT), $id]);
                } elseif (!password_verify($pin, $u['pin_hash'])) { note_attempt(); $err = '비밀번호가 맞지 않습니다. 잊었으면 교수님께 초기화를 부탁하세요.'; }
            } else {
                if (empty($s['signup_open'])) $err = '지금은 새로 들어올 수 없습니다(교수님이 닫아 둠).';
                elseif ($name === '' || mb_strlen($name) > 20) $err = '처음 들어올 때는 이름(20자 안)을 함께 적어 주세요.';
                else {
                    qexec('INSERT INTO student (id, name, pin_hash, created_at) VALUES (?,?,?,?)', [$id, $name, password_hash($pin, PASSWORD_DEFAULT), now()]);
                    ensure_site($id, $name);
                }
            }
            if ($err === '') {
                session_regenerate_id(true);
                $_SESSION['sid'] = $id;
                qexec('UPDATE student SET last_seen = ? WHERE id = ?', [now(), $id]);
                header('Location: ./'); exit;
            }
        }
    }
}

$u = me();
if (!$u) {
    page_head('들어가기');
    ?>
  <span class="step">메타데이터와아카이빙연구 학생 실습실</span>
  <h1>실습실에 들어가기</h1>
  <p>이 실습실은 우리 수업 서버에서 돌아갑니다. 프로그램을 설치하지 않고, 폰이나 노트북 브라우저로 서버를 써 봅니다.</p>
  <?php if ($err): ?><div class="notice warn"><?= h($err) ?></div><?php endif; ?>
  <form method="post" class="card form">
    <?= csrf_field() ?><input type="hidden" name="who" value="student">
    <label>수업 코드 <input name="code" required autocomplete="off" value="<?= h($_POST['code'] ?? '') ?>"></label>
    <label>아이디 <small>영문 소문자와 숫자 3~12자. 내 홈페이지 주소가 됩니다.</small>
      <input name="id" required pattern="[a-z][a-z0-9]{2,11}" autocapitalize="none" autocomplete="username" value="<?= h($_POST['id'] ?? '') ?>"></label>
    <label>비밀번호 <small>숫자 네 자리. 처음 들어올 때 정합니다.</small>
      <input name="pin" required inputmode="numeric" pattern="\d{4}" maxlength="4" type="password" autocomplete="current-password"></label>
    <label>이름 <small>처음 들어올 때만 적습니다. 친구들에게 보이는 이름입니다.</small>
      <input name="name" maxlength="20" value="<?= h($_POST['name'] ?? '') ?>"></label>
    <button type="submit">들어가기</button>
  </form>
  <details class="card">
    <summary>교수로 들어가기</summary>
    <form method="post" class="form">
      <?= csrf_field() ?><input type="hidden" name="who" value="teacher">
      <label>교수 코드 <input name="tcode" type="password" autocomplete="off"></label>
      <button type="submit">들어가기</button>
    </form>
  </details>
<?php
    page_foot();
    exit;
}

if ($u['teacher']) { header('Location: teacher.php'); exit; }
$id = $u['id'];
ensure_site($id, $u['name']);
$base = server_base();
$siteFiles = count(list_site($id, ''));
$solved = q1('SELECT COUNT(*) AS n FROM solved WHERE student_id = ?', [$id])['n'];
require __DIR__ . '/../../lib/exercises.php';
$items = q1('SELECT COUNT(*) AS n FROM item WHERE owner = ?', [$id])['n'];
$visits = q1('SELECT COUNT(*) AS n FROM visit WHERE site = ?', [$id])['n'];
$classmates = qall('SELECT id, name FROM student ORDER BY name');
page_head('처음', $u, 'index.php');
?>
  <span class="step">학생 실습실</span>
  <h1><?= h($u['name']) ?>님, 어서 오세요</h1>
  <p>세 가지 실습이 있습니다. 순서대로 하면 좋지만, 어느 것부터 해도 됩니다.</p>

  <nav class="steps three">
    <a href="home.php"><span class="step">A 서버</span><br><b>내 홈페이지 올리기</b><br>
      <span class="muted">서버의 내 폴더에 파일을 올리면 주소가 생깁니다. 폴더와 주소가 어떻게 짝지어지는지, 서버가 무엇을 기록하는지 봅니다.</span>
      <span class="progress">내 폴더 파일 <?= $siteFiles ?>개, 방문 기록 <?= $visits ?>건</span></a>
    <a href="sql.php"><span class="step">B 데이터베이스</span><br><b>SQL 실습실</b><br>
      <span class="muted">권장도서 2,175권이 든 서버 DB에 묻고, 지은이 칸을 나눈 표를 잇고, 우리 반이 함께 쓰는 DB에 기록을 넣고, 내 DB를 고쳐 봅니다.</span>
      <span class="progress">푼 문제 <?= $solved ?> / <?= count(SQL_EXERCISES) ?></span></a>
    <a href="archive.php"><span class="step">C 아카이빙</span><br><b>우리 반 아카이브</b><br>
      <span class="muted">사진, 소리, 영상을 올리면 서버가 체크섬과 기술 메타데이터, 이용본을 만듭니다. 기술(記述) 메타데이터를 달고, 고정성을 검사하고, 꾸러미(BagIt)로 내려받습니다.</span>
      <span class="progress">내가 넣은 자료 <?= $items ?>건</span></a>
  </nav>

  <h2>서버 안에서 내 자리</h2>
  <div class="card">
    <p>서버는 늘 켜져 있는 컴퓨터입니다. 이 실습실에서 여러분의 자료는 서버의 아래 폴더에 들어갑니다.</p>
    <table class="kv">
      <tr><th>내 홈페이지 폴더</th><td><code><?= h(LAB_VAR) ?>/sites/<?= h($id) ?>/</code><br>
        ↔ 주소 <a href="/u/<?= h($id) ?>/" target="_blank"><?= h($base) ?>/u/<?= h($id) ?>/</a></td></tr>
      <tr><th>내 DB 파일</th><td><code><?= h(LAB_VAR) ?>/mydb/<?= h($id) ?>.db</code><br><span class="muted">주소가 없습니다. 웹으로 내보내는 폴더 바깥이라 실습실 프로그램을 거쳐서만 씁니다.</span></td></tr>
      <tr><th>아카이브 자료</th><td><code><?= h(LAB_VAR) ?>/archive/자료번호/</code> 와 사본 <code><?= h(LAB_VAR) ?>/backup/자료번호/</code></td></tr>
    </table>
  </div>

  <h2>우리 반 홈페이지</h2>
  <ul class="classmates">
    <?php foreach ($classmates as $c): ?><li><a href="/u/<?= h($c['id']) ?>/" target="_blank"><?= h($c['name']) ?></a> <small class="muted">/u/<?= h($c['id']) ?>/</small></li><?php endforeach; ?>
  </ul>
<?php page_foot();
