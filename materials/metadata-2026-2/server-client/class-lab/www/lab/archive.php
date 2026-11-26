<?php
// C 실습: 우리 반 아카이브. 자료 올리기와 목록.
require __DIR__ . '/../../lib/archive.php';
$u = require_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['act'] ?? '') === 'upload') {
    check_csrf();
    if (empty(settings()['archive_open']) && !$u['teacher']) json_out(['ok' => false, 'error' => '지금은 교수님이 올리기를 닫아 두었습니다.']);
    if (empty($_FILES['file'])) json_out(['ok' => false, 'error' => '파일이 오지 않았습니다. ' . fmt_bytes(ARCHIVE_FILE_MAX) . '보다 큰지 보세요.']);
    [$id, $err] = ingest($u, $_FILES['file'], preg_replace('/[^0-9a-f]/', '', strtolower((string) ($_POST['sha256'] ?? ''))), !empty($_POST['sample']));
    json_out($id ? ['ok' => true, 'id' => $id] : ['ok' => false, 'error' => $err]);
}

$kind = $_GET['kind'] ?? '';
$who = $_GET['who'] ?? '';
$q = trim((string) ($_GET['q'] ?? ''));
$where = []; $p = [];
if (in_array($kind, ['image', 'audio', 'video'], true)) { $where[] = 'kind = ?'; $p[] = $kind; }
if ($who === 'me') { $where[] = 'owner = ?'; $p[] = $u['id']; }
if ($q !== '') { $where[] = '(dc LIKE ? OR orig_name LIKE ?)'; $p[] = "%$q%"; $p[] = "%$q%"; }
$rows = qall('SELECT i.*, s.name AS owner_name FROM item i LEFT JOIN student s ON s.id = i.owner' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY i.id DESC LIMIT 300', $p);
$samples = is_dir(LAB_VAR . '/samples') ? array_values(array_filter(scandir(LAB_VAR . '/samples'), fn($f) => $f[0] !== '.')) : [];
$need = ['title', 'creator', 'date', 'subject', 'description', 'rights'];

page_head('C 우리 반 아카이브', $u, 'archive.php');
?>
  <span class="step">C 아카이빙: 우리 반 아카이브</span>
  <h1>사진, 소리, 영상을 아카이브에 넣기</h1>
  <p>자료를 올리면 서버가 <b>받고(ingest)</b>, <b>체크섬을 재고</b>, <b>형식을 알아보고</b>, <b>기술 메타데이터를 뽑고</b>, <b>이용본을 만들고</b>, 그 모든 일을 <b>보존 기록</b>으로 남깁니다. 여러분은 사람만 알 수 있는 것, 곧 <b>기술(記述) 메타데이터</b>(더블린 코어)를 답니다.</p>

  <div class="cols">
    <div class="card">
      <b>1. 자료 올리기</b>
      <div class="drop" id="drop">
        <p>사진, 소리, 영상 파일을 여기에 끌어다 놓거나 고르세요.<br><small>파일 하나 <?= fmt_bytes(ARCHIVE_FILE_MAX) ?>까지, 한 사람 <?= ARCHIVE_PER_STUDENT ?>건까지. 영상은 30초 안쪽을 권합니다.</small></p>
        <input type="file" id="file" accept="image/*,audio/*,video/*,.heic,.wav,.m4a,.mov">
      </div>
      <ol id="steps" class="muted"></ol>
      <progress id="bar" max="100" value="0" hidden></progress>
    </div>
    <div class="card">
      <b>보기 파일 묶음</b>
      <p class="muted">수업용으로 만든 사진, 녹음, 영상입니다. 일부러 문제가 있는 파일(이름만 바꾼 파일, 깨진 파일, 위치 정보가 든 사진, 한글과 띄어쓰기가 든 이름)도 들어 있습니다. 내 컴퓨터로 받아 하나씩 올려 보세요.</p>
      <?php if ($samples): ?>
      <ul><?php foreach ($samples as $s): ?><li><a href="sample.php?f=<?= h(rawurlencode($s)) ?>"><?= h($s) ?></a> <small class="muted"><?= fmt_bytes(filesize(LAB_VAR . "/samples/$s")) ?></small></li><?php endforeach; ?></ul>
      <?php else: ?><p class="muted">(아직 준비되지 않았습니다)</p><?php endif; ?>
      <p class="muted">내가 찍은 것도 좋습니다: 도서관 서가 사진, 내 목소리로 녹음한 책 소개, 열람실 20초 영상. 다른 사람의 얼굴이나 목소리가 들어가면 먼저 동의를 받으세요.</p>
    </div>
  </div>

  <h2>2. 아카이브 목록</h2>
  <form class="row" method="get">
    <select name="kind"><option value="">모든 유형</option><?php foreach (['image' => '사진 (StillImage)', 'audio' => '소리 (Sound)', 'video' => '영상 (MovingImage)'] as $k => $l): ?><option value="<?= $k ?>"<?= $kind === $k ? ' selected' : '' ?>><?= $l ?></option><?php endforeach; ?></select>
    <select name="who"><option value="">우리 반 모두</option><option value="me"<?= $who === 'me' ? ' selected' : '' ?>>내 자료만</option></select>
    <input type="search" name="q" value="<?= h($q) ?>" placeholder="제목, 주제어, 파일 이름" style="flex:1">
    <button>거르기</button>
  </form>
  <div class="items" style="margin-top:.8rem">
    <?php foreach ($rows as $r): $dc = json_decode((string) $r['dc'], true) ?: []; $ac = json_decode((string) $r['access'], true) ?: [];
      $filled = count(array_filter($need, fn($k) => trim((string) ($dc[$k] ?? '')) !== '')); ?>
    <a class="item" href="item.php?id=<?= (int) $r['id'] ?>">
      <div class="thumb"><?php if (!empty($ac['thumb'])): ?><img src="file.php?id=<?= (int) $r['id'] ?>&amp;f=<?= h($ac['thumb']) ?>" alt="" loading="lazy"><?php else: ?><?= $r['status'] === 'done' ? '이용본 없음' : '처리 중…' ?><?php endif; ?></div>
      <div class="cap"><b><?= h($dc['title'] ?? '' ?: '(제목 없음) ' . $r['orig_name']) ?></b>
        <span class="muted"><?= h($r['owner_name'] ?? $r['owner']) ?>, <?= h(DCMI_TYPE[$r['kind']] ?? $r['kind']) ?></span><br>
        <span class="badge <?= $filled === count($need) ? 'ok' : 'warn' ?>">메타데이터 <?= $filled ?>/<?= count($need) ?></span>
        <?php if ($r['error']): ?><span class="badge bad">문제 있음</span><?php endif; ?></div>
    </a>
    <?php endforeach; ?>
    <?php if (!$rows): ?><p class="muted">아직 자료가 없습니다.</p><?php endif; ?>
  </div>

<script src="sha256.js"></script>
<script>
(function () {
  var input = document.getElementById('file'), drop = document.getElementById('drop'), steps = document.getElementById('steps'), bar = document.getElementById('bar');
  function step(t) { var li = document.createElement('li'); li.textContent = t; steps.appendChild(li); return li; }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function send(file) {
    steps.innerHTML = ''; steps.classList.remove('muted');
    if (file.size > <?= ARCHIVE_FILE_MAX ?>) { step('파일이 너무 큽니다(' + Math.round(file.size / 1048576) + 'MB).'); return; }
    var s1 = step('내 컴퓨터에서 SHA-256 체크섬을 재는 중… (파일 지문)');
    // http 주소에서는 crypto.subtle이 막혀 있어 sha256.js로 직접 잽니다.
    var hashing = file.arrayBuffer().then(function (b) {
      if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-256', b).then(hex);
      return new Promise(function (ok) { setTimeout(function () { ok(window.sha256 ? sha256(b) : ''); }, 30); });
    });
    hashing.catch(function () { return ''; }).then(function (sha) {
      s1.textContent = sha ? '내 컴퓨터에서 잰 SHA-256: ' + sha.slice(0, 16) + '…' : '체크섬을 재지 못했습니다. 서버 값만 씁니다.';
      var s2 = step('서버로 보내는 중… 0%'); bar.hidden = false; bar.value = 0;
      var fd = new FormData(); fd.append('csrf', window.LAB_CSRF); fd.append('sha256', sha); fd.append('file', file);
      var x = new XMLHttpRequest(); x.open('POST', 'archive.php?act=upload');
      x.upload.onprogress = function (e) { if (e.lengthComputable) { var p = Math.round(e.loaded / e.total * 100); bar.value = p; s2.textContent = '서버로 보내는 중… ' + p + '%'; } };
      x.onload = function () {
        var j; try { j = JSON.parse(x.responseText); } catch (e) { j = { ok: false, error: '서버가 받지 못했습니다(파일이 너무 클 수 있음).' }; }
        if (!j.ok) { s2.textContent = j.error; return; }
        s2.textContent = '서버가 받았습니다. 자료 화면으로 갑니다.'; location.href = 'item.php?id=' + j.id;
      };
      x.onerror = function () { s2.textContent = '연결이 끊겼습니다.'; };
      x.send(fd);
    });
  }
  input.onchange = function () { if (input.files[0]) send(input.files[0]); };
  ['dragover', 'dragenter'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (ev) { if (ev.dataTransfer.files[0]) send(ev.dataTransfer.files[0]); });
})();
</script>
<?php page_foot();
