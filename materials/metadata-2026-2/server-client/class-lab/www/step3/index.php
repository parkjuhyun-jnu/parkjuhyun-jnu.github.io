<?php
// 3단계: 손님(브라우저)이 찾을 말을 보내면, 서버가 데이터베이스에 SQL로 묻고, 찾은 책만 HTML로 만들어 보냅니다.
require __DIR__ . '/db.php';
function h($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

$q = param('q');
$field = param('field', 10) ?: 'all';
$age = param('age', 10);
$genre = param('genre', 20);
$db = open_db();
$res = null;
if ($db) {
    $all = (int) $db->query('SELECT COUNT(*) FROM book')->fetchColumn();
    $res = find_books($db, $q, $field, $age, $genre);
    $ages = options($db, 'age');
    $genres = options($db, 'genre');
}
$api = 'api.php?' . http_build_query(array_filter(['q' => $q, 'field' => $field === 'all' ? '' : $field, 'age' => $age, 'genre' => $genre]));
?><!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>3단계 · 서버에게 찾아 달라고 하기</title>
<link rel="stylesheet" href="../style.css">
</head>
<body>
<main>
  <p><a href="../">← 처음으로</a></p>
  <span class="step">3단계 · 서버에게 찾아 달라고 하기</span>
  <h1>어린이 권장도서 찾기 <small class="muted">(서버 검색)</small></h1>

<?php if (!$db): ?>
  <div class="notice warn"><b>데이터베이스가 아직 없습니다.</b><br>교수님이 서버에서 목록을 데이터베이스(<code>data/books.db</code>)에 넣으면, 새로고침했을 때 찾기 칸이 나타납니다.</div>
<?php else: ?>
  <div class="notice ok">서버의 데이터베이스에 책 <b><?= number_format($all) ?>권</b>이 들어 있습니다. 내 폰은 목록 전체를 받지 않습니다.</div>

  <form class="search" method="get" action="">
    <div class="row">
      <input type="search" name="q" value="<?= h($q) ?>" placeholder="책이름, 지은이, 출판사로 찾기 (예: 권정생)" aria-label="찾을 말">
      <button type="submit">찾기</button>
    </div>
    <div class="row">
      <select name="field" aria-label="찾을 칸">
        <?php foreach (['all' => '모든 칸', 'title' => '책이름', 'author' => '지은이', 'publisher' => '출판사'] as $v => $label): ?>
        <option value="<?= $v ?>"<?= $field === $v ? ' selected' : '' ?>><?= $label ?></option>
        <?php endforeach; ?>
      </select>
      <select name="age" aria-label="연령"><option value="">모든 연령</option>
        <?php foreach ($ages as $v): ?><option<?= $age === $v ? ' selected' : '' ?>><?= h($v) ?></option><?php endforeach; ?>
      </select>
      <select name="genre" aria-label="갈래"><option value="">모든 갈래</option>
        <?php foreach ($genres as $v): ?><option<?= $genre === $v ? ' selected' : '' ?>><?= h($v) ?></option><?php endforeach; ?>
      </select>
    </div>
  </form>

  <div class="stats">
    <div><b><?= number_format($res['total']) ?>권</b><small>서버가 찾은 책</small></div>
    <div><b><?= $res['ms'] < 1 ? '1ms 미만' : number_format($res['ms'], 1) . 'ms' ?></b><small>찾는 데 걸린 시간 (서버)</small></div>
    <div><b id="got">-</b><small>내 폰이 받은 양</small></div>
  </div>

  <p class="muted"><?= ($q !== '' || $age !== '' || $genre !== '') ? '찾은 책' : '전체' ?> <?= number_format($res['total']) ?>권<?= $res['total'] > MAX_ROWS ? ' (책이름 순으로 앞의 ' . MAX_ROWS . '권만 보냈습니다)' : '' ?></p>
  <ol class="books">
  <?php foreach ($res['rows'] as $b): ?>
    <li><div class="t"><?= h($b['title']) ?></div>
      <div class="m"><?= h($b['author']) ?> · <?= h($b['publisher']) ?> · <?= h($b['pub_year']) ?></div>
      <div class="m"><span class="tag"><?= h($b['age']) ?></span><span class="tag"><?= h($b['genre']) ?></span>
        <?php if ($b['url']): ?> <a href="<?= h($b['url']) ?>" target="_blank" rel="noopener">연구회 소개 보기</a><?php endif; ?></div></li>
  <?php endforeach; ?>
  </ol>

  <details class="card">
    <summary><b>서버가 데이터베이스에 보낸 SQL 보기</b></summary>
    <pre><?= h($res['sql']) ?></pre>
    <p class="muted">3강 SQL 실습실에서 썼던 SELECT · WHERE · LIKE · ORDER BY · LIMIT와 같습니다. 찾을 말은 SQL에 바로 붙이지 않고 <code>?</code> 자리로 따로 넘겨 실행합니다(SQL 삽입 공격 막기).</p>
  </details>

  <details class="card">
    <summary><b>같은 결과를 JSON으로 받기 (API)</b></summary>
    <p>사람이 아니라 프로그램이 받아 쓰도록, 같은 검색 결과를 JSON으로 주는 주소입니다. 2강의 API 실습과 같은 모양입니다.</p>
    <p><a href="<?= h($api) ?>"><?= h($api) ?></a></p>
  </details>
<?php endif; ?>

  <div class="card">
    <b>여기서 누가 일했나요?</b>
    <div class="who">
      <div class="client"><b>내 폰</b>찾을 말을 주소에 붙여(<code>?q=…</code>) 서버에 보냈고, 서버가 만들어 준 결과 화면을 그리기만 했습니다.</div>
      <div class="server"><b>서버</b>PHP 프로그램이 주소에서 찾을 말을 꺼내 SQL을 만들고, 데이터베이스에 묻고, 찾은 책만 골라 HTML로 만들어 보냈습니다.</div>
    </div>
    <p class="muted">이 화면은 서버가 <?= h(date('Y-m-d H:i:s')) ?>에 만들었습니다 (PHP <?= h(PHP_VERSION) ?>). 새로고침하면 시각이 바뀝니다. 1단계 파일과 다른 점입니다.</p>
  </div>

  <footer>목록 출처: (사)어린이도서연구회 ‘추천 목록’(7세부터·9세부터·11세부터)의 서지 사항. 소개글은 싣지 않았습니다.</footer>
</main>
<script>
  // 받은 양은 내 폰의 브라우저가 잽니다.
  (function () {
    var n = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var bytes = (n && (n.encodedBodySize || n.transferSize)) || new Blob([document.documentElement.outerHTML]).size;
    var el = document.getElementById('got');
    if (el) el.textContent = bytes > 1024 ? Math.round(bytes / 1024) + ' KB' : bytes + ' B';
  })();
</script>
</body>
</html>
