<?php
// C 실습: 자료 하나. 미리 보기, 더블린 코어 달기, 기술 메타데이터, 보존 기록, 고정성 검사, 내보내기.
require __DIR__ . '/../../lib/archive.php';
$u = require_login();
$id = (int) ($_GET['id'] ?? 0);
$it = item($id);
if (!$it) { http_response_code(404); page_head('없는 자료', $u, 'archive.php'); echo '<p>그런 자료가 없습니다. <a href="archive.php">목록으로</a></p>'; page_foot(); exit; }
$mine = can_edit($u, $it);
$msg = []; $fix = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $act = $_POST['act'] ?? '';
    if ($act === 'fixity') { $fix = fixity_check($it, $u['id']); }
    elseif (!$mine) { $msg[] = ['warn', '이 자료를 올린 사람만 고칠 수 있습니다.']; }
    elseif ($act === 'dc') {
        $dc = $it['dc'];
        foreach (['title', 'creator', 'date', 'subject', 'description', 'language', 'rights', 'relation', 'coverage'] as $k) {
            $dc[$k] = trim(mb_substr((string) ($_POST[$k] ?? ''), 0, $k === 'description' ? 1000 : 200));
        }
        $bad = [];
        if ($dc['date'] !== '' && !preg_match('/^\d{4}(-\d{2}(-\d{2})?)?$/', $dc['date'])) $bad[] = "날짜는 2026-11-26처럼 연-월-일(ISO 8601)로 씁니다. 연도나 연-월만 알아도 됩니다.";
        if ($dc['language'] !== '' && !preg_match('/^[a-z]{3}$/', $dc['language'])) $bad[] = '언어는 kor, eng, zxx처럼 영문 소문자 세 글자(ISO 639-2) 부호로 씁니다.';
        if ($dc['rights'] !== '' && !isset(RIGHTS[$dc['rights']])) $dc['rights'] = '';
        qexec('UPDATE item SET dc = ? WHERE id = ?', [json_encode($dc, JSON_UNESCAPED_UNICODE), $id]);
        add_event($id, '기술(記述) 메타데이터 고침', '성공', '더블린 코어 ' . count(array_filter($dc, fn($v, $k) => $k[0] !== '_' && $v !== '', ARRAY_FILTER_USE_BOTH)) . '개 요소 채움', $u['id']);
        $msg[] = ['ok', '메타데이터를 저장했습니다.'];
        foreach ($bad as $b) $msg[] = ['warn', $b];
    } elseif ($act === 'flip') { flip_bit($it, $u['id']); $msg[] = ['warn', '원본의 비트 하나를 바꿨습니다(연습). 이제 [고정성 검사]를 눌러 보세요.']; }
    elseif ($act === 'repair') { $msg[] = repair($it, $u['id']) ? ['ok', '사본으로 원본을 되살렸습니다. 다시 [고정성 검사]를 눌러 보세요.'] : ['warn', '사본도 맞지 않아 되살리지 못했습니다.']; }
    elseif ($act === 'reprocess') { qexec("UPDATE item SET status = 'queued' WHERE id = ?", [$id]); start_job($id); $msg[] = ['ok', '다시 처리하도록 맡겼습니다.']; }
    elseif ($act === 'delete') { delete_item($id); header('Location: archive.php'); exit; }
    $it = item($id);
}

if (isset($_GET['export'])) {
    $name = str_replace(':', '-', $it['dc']['identifier'] ?? "item-$id");
    if ($_GET['export'] === 'xml') { header('Content-Type: application/xml; charset=utf-8'); header("Content-Disposition: inline; filename=\"$name-dc.xml\""); echo dc_xml($it); exit; }
    if ($_GET['export'] === 'json') { header('Content-Type: application/json; charset=utf-8'); header("Content-Disposition: inline; filename=\"$name.json\""); echo json_encode(item_json($it), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
    if ($_GET['export'] === 'bag' && $mine) {
        $z = make_bag($it);
        add_event($id, '꾸러미 내보내기 (BagIt)', '성공', basename($z) . ' 를 만들어 내려보냄', $u['id']);
        header('Content-Type: application/zip'); header('Content-Disposition: attachment; filename="bag-' . $name . '.zip"'); header('Content-Length: ' . filesize($z));
        readfile($z); @unlink($z); exit;
    }
}

$dc = $it['dc']; $ac = $it['access']; $tech = $it['tech']; $sum = $tech['summary'] ?? [];
$rel = relation_book($dc);
$owner = q1('SELECT name FROM student WHERE id = ?', [$it['owner']])['name'] ?? $it['owner'];
$ev = events($id);
$processing = in_array($it['status'], ['queued', 'processing'], true);
page_head($dc['title'] ?: '자료 ' . $id, $u, 'archive.php');
?>
  <p><a href="archive.php">← 아카이브 목록</a></p>
  <span class="step"><?= h($dc['identifier'] ?? '') ?>, <?= h(DCMI_TYPE[$it['kind']] ?? $it['kind']) ?></span>
  <h1><?= h($dc['title'] ?: '(제목 없음)') ?></h1>
  <p class="muted">올린 사람 <?= h($owner) ?>, 원래 파일 이름 <code><?= h($it['orig_name']) ?></code>, <?= fmt_bytes($it['size']) ?>, <?= h($it['created_at']) ?></p>
  <?php foreach ($msg as [$k, $m]): ?><div class="notice <?= $k ?>"><?= h($m) ?></div><?php endforeach; ?>
  <?php if ($processing): ?><div class="notice warn">서버가 이 자료를 처리하는 중입니다(기술 메타데이터 뽑기, 이용본 만들기). 잠시 뒤 저절로 새로고침합니다.</div><script>setTimeout(function () { location.reload(); }, 4000);</script><?php endif; ?>
  <?php if ($it['error']): ?><div class="notice warn"><b>처리하다 생긴 문제:</b> <?= h($it['error']) ?> 아래 보존 기록에서 자세히 봅니다. 왜 이런 일이 생겼는지, 아카이브는 이 파일을 어떻게 다뤄야 하는지 생각해 보세요.</div><?php endif; ?>

  <div class="cols">
    <div>
      <div class="card media">
        <?php if (!empty($ac['view'])): ?><img src="file.php?id=<?= $id ?>&amp;f=<?= h($ac['view']) ?>" alt="<?= h($dc['title']) ?>">
        <?php elseif (($ac['play'] ?? '') === 'access.mp4'): ?><video controls playsinline preload="metadata" <?= !empty($ac['thumb']) ? 'poster="file.php?id=' . $id . '&amp;f=' . h($ac['thumb']) . '"' : '' ?> src="file.php?id=<?= $id ?>&amp;f=access.mp4"></video>
        <?php elseif (($ac['play'] ?? '') === 'access.mp3'): ?><?php if (!empty($ac['thumb'])): ?><img src="file.php?id=<?= $id ?>&amp;f=<?= h($ac['thumb']) ?>" alt="파형"><?php endif; ?><audio controls preload="metadata" src="file.php?id=<?= $id ?>&amp;f=access.mp3"></audio>
        <?php else: ?><p class="muted">이용본이 없습니다.</p><?php endif; ?>
        <p class="muted">위에 보이는 것은 서버가 만든 <b>이용본</b>입니다. 원본(보존본)은 손대지 않고 따로 둡니다.</p>
      </div>

      <h2>기술(記述) 메타데이터: 더블린 코어</h2>
      <?php if ($mine): ?>
      <form method="post" class="card form" style="max-width:none">
        <?= csrf_field() ?><input type="hidden" name="act" value="dc">
        <?php foreach (DC_FIELDS as $k => [$label, $help]): if (in_array($k, ['type', 'format', 'identifier'], true)) continue; ?>
        <label><?= h($label) ?> <small>dc:<?= $k ?>. <?= h($help) ?></small>
          <?php if ($k === 'description'): ?><textarea name="description" rows="3"><?= h($dc['description'] ?? '') ?></textarea>
          <?php elseif ($k === 'rights'): ?><select name="rights"><option value="">(고르세요)</option><?php foreach (RIGHTS as $rk => $rl): ?><option value="<?= h($rk) ?>"<?= ($dc['rights'] ?? '') === $rk ? ' selected' : '' ?>><?= h($rl) ?></option><?php endforeach; ?></select>
          <?php elseif ($k === 'relation'): ?>
            <input type="hidden" name="relation" id="relation" value="<?= h($dc['relation'] ?? '') ?>">
            <span id="relname"><?= $rel ? h($rel['title'] . ' (' . $rel['publisher'] . ')') : '(없음)' ?></span>
            <span class="row"><input type="search" id="rq" placeholder="권장도서 찾기" style="flex:1"><button type="button" class="small ghost" id="rfind">찾기</button><button type="button" class="small ghost" id="rclear">비우기</button></span>
            <ul id="rres" class="muted"></ul>
          <?php else: ?><input name="<?= $k ?>" value="<?= h($dc[$k] ?? '') ?>"<?= $k === 'title' && empty($dc['title']) ? ' placeholder="' . h($dc['_suggest_title'] ?? '') . '"' : '' ?><?= $k === 'date' && !empty($sum['촬영(만든) 때']) ? ' placeholder="기술 메타데이터의 촬영 때: ' . h(substr((string) $sum['촬영(만든) 때'], 0, 10)) . '"' : '' ?>><?php endif; ?>
        </label>
        <?php endforeach; ?>
        <p class="muted">유형(dc:type) <b><?= h($dc['type'] ?? '') ?></b>, 형식(dc:format) <b><?= h($it['mime']) ?></b>, 식별자(dc:identifier) <b><?= h($dc['identifier'] ?? '') ?></b>는 서버가 채웠습니다.</p>
        <button>메타데이터 저장</button>
      </form>
      <?php else: ?>
      <table class="kv card"><?php foreach (DC_FIELDS as $k => [$label]): $val = $k === 'relation' ? ($rel['title'] ?? '') : ($k === 'rights' ? (RIGHTS[$dc['rights'] ?? ''] ?? '') : ($k === 'format' ? $it['mime'] : ($dc[$k] ?? ''))); ?>
        <tr><th><?= h($label) ?> <small class="muted">dc:<?= $k ?></small></th><td><?= h($val) ?: '<span class="muted">(비어 있음)</span>' ?></td></tr><?php endforeach; ?></table>
      <?php endif; ?>
    </div>

    <div>
      <h2 style="margin-top:0">기술 메타데이터 <small class="muted">(서버가 파일 속에서 뽑음)</small></h2>
      <table class="kv card">
        <tr><th>형식 (MIME)</th><td><code><?= h($it['mime']) ?></code> <?php if (($dx = EXT_MIME[$it['ext']] ?? null) && explode('/', $dx)[1] !== explode('/', $it['mime'])[1] && !($dx === 'audio/x-wav' && strpos($it['mime'], 'wav') !== false)): ?><span class="badge bad">확장자 .<?= h($it['ext']) ?>와 다름</span><?php endif; ?></td></tr>
        <tr><th>크기</th><td><?= number_format((int) $it['size']) ?> 바이트</td></tr>
        <?php foreach ($sum as $k => $v): ?><tr><th><?= h($k) ?></th><td><?= h(is_array($v) ? json_encode($v, JSON_UNESCAPED_UNICODE) : $v) ?><?php if (in_array($k, ['위도', '경도'], true)): ?> <span class="badge bad">위치 정보</span><?php endif; ?></td></tr><?php endforeach; ?>
      </table>
      <?php if (!empty($tech['exiftool']) || !empty($tech['ffprobe'])): ?>
      <details class="card"><summary>도구가 뽑은 전체 값 보기 (exiftool <?= count($tech['exiftool'] ?? []) ?>개<?= !empty($tech['ffprobe']) ? ', ffprobe' : '' ?>)</summary>
        <pre style="max-height:24rem"><?= h(json_encode(['exiftool' => $tech['exiftool'] ?? [], 'ffprobe' => $tech['ffprobe'] ?? []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) ?></pre></details>
      <?php endif; ?>

      <h2>고정성 (fixity)</h2>
      <div class="card">
        <p>받을 때 잰 SHA-256<br><code style="word-break:break-all"><?= h($it['sha256']) ?></code></p>
        <?php if ($it['client_sha256']): ?><p class="muted">올린 사람 컴퓨터에서 잰 값: <?= hash_equals($it['client_sha256'], $it['sha256']) ? '<span class="badge ok">같음</span>' : '<span class="badge bad">다름</span>' ?></p><?php endif; ?>
        <?php if ($fix): ?><table class="kv"><?php foreach ($fix as $lbl => $r): ?><tr><th><?= h($lbl) ?></th><td><span class="badge <?= $r['ok'] ? 'ok' : 'bad' ?>"><?= $r['ok'] ? '일치' : '불일치' ?></span> <code style="word-break:break-all"><?= h($r['sha']) ?></code></td></tr><?php endforeach; ?></table><?php endif; ?>
        <form method="post" class="row"><?= csrf_field() ?><input type="hidden" name="act" value="fixity"><button>고정성 검사</button></form>
        <?php if ($mine): ?>
        <p class="muted">연습: 원본의 비트 하나를 일부러 바꾼 뒤 고정성 검사를 하고, 사본으로 되살려 보세요. 아카이브가 왜 두 벌 이상을 두는지 알 수 있습니다.</p>
        <div class="row">
          <form method="post"><?= csrf_field() ?><input type="hidden" name="act" value="flip"><button class="small danger" onclick="return confirm('원본의 비트 하나를 바꿀까요? (연습, 사본으로 되살릴 수 있음)')">비트 하나 바꾸기</button></form>
          <form method="post"><?= csrf_field() ?><input type="hidden" name="act" value="repair"><button class="small ghost">사본으로 되살리기</button></form>
        </div>
        <?php endif; ?>
      </div>

      <h2>내보내기</h2>
      <div class="card">
        <p class="row"><a class="btn small ghost" href="item.php?id=<?= $id ?>&amp;export=xml" target="_blank">더블린 코어 XML (oai_dc)</a>
          <a class="btn small ghost" href="item.php?id=<?= $id ?>&amp;export=json" target="_blank">모든 메타데이터 JSON</a>
          <?php if ($mine): ?><a class="btn small ghost" href="file.php?id=<?= $id ?>&amp;f=original">원본 내려받기</a>
          <a class="btn small" href="item.php?id=<?= $id ?>&amp;export=bag">BagIt 꾸러미 (zip)</a><?php endif; ?></p>
        <p class="muted">BagIt 꾸러미는 원본과 메타데이터, 그리고 모든 파일의 체크섬 목록(manifest-sha256.txt)을 한데 묶은 것입니다. 다른 기관으로 옮겨도 받은 쪽이 하나도 빠지거나 바뀌지 않았는지 확인할 수 있습니다.</p>
      </div>

      <h2>보존 기록 <small class="muted">(PREMIS 사건)</small></h2>
      <ol class="events card">
        <?php foreach ($ev as $e): ?><li><b><?= h($e['type']) ?></b> <span class="badge <?= in_array($e['outcome'], ['성공', '일치'], true) ? 'ok' : (in_array($e['outcome'], ['실패', '불일치'], true) ? 'bad' : 'warn') ?>"><?= h($e['outcome']) ?></span>
          <br><small class="muted"><?= h($e['at']) ?>, 한 쪽: <?= h($e['agent']) ?></small><br><?= h($e['detail']) ?></li><?php endforeach; ?>
      </ol>
      <?php if ($mine): ?>
      <div class="row">
        <form method="post"><?= csrf_field() ?><input type="hidden" name="act" value="reprocess"><button class="small ghost">다시 처리</button></form>
        <form method="post"><?= csrf_field() ?><input type="hidden" name="act" value="delete"><button class="small danger" onclick="return confirm('이 자료와 사본, 기록을 모두 지울까요?')">자료 지우기</button></form>
      </div>
      <?php endif; ?>
    </div>
  </div>
<?php if ($mine): ?>
<script>
(function () {
  var q = document.getElementById('rq'), res = document.getElementById('rres');
  if (!q) return;
  function find() {
    fetch('api.php?action=books&q=' + encodeURIComponent(q.value)).then(function (r) { return r.json(); }).then(function (j) {
      res.innerHTML = '';
      (j.books || []).slice(0, 10).forEach(function (b) {
        var li = document.createElement('li'), btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'small ghost'; btn.textContent = '고르기';
        btn.onclick = function () { document.getElementById('relation').value = 'book:' + b.id; document.getElementById('relname').textContent = b.title + ' (' + b.publisher + ')'; res.innerHTML = ''; };
        li.appendChild(document.createTextNode(b.title + ' / ' + b.author + ' ')); li.appendChild(btn); res.appendChild(li);
      });
    });
  }
  document.getElementById('rfind').onclick = find;
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); find(); } });
  document.getElementById('rclear').onclick = function () { document.getElementById('relation').value = ''; document.getElementById('relname').textContent = '(없음)'; };
})();
</script>
<?php endif; ?>
<?php page_foot();
