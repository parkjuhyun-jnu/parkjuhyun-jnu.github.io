<?php
// B 실습: SQL 실습실. 서버의 DB에 SQL을 보내고 결과를 받습니다.
require __DIR__ . '/../../lib/app.php';
require __DIR__ . '/../../lib/exercises.php';
$u = require_login();
$set = $_GET['set'] ?? 'catalog';
if (!isset(SQL_SETS[$set])) $set = 'catalog';
if ($u['teacher'] && in_array($set, ['shared', 'mydb'], true)) $set = 'catalog';
$S = SQL_SETS[$set];
$exs = exercises_of($set);
$done = [];
foreach (qall('SELECT ex_id FROM solved WHERE student_id = ?', [$u['id']]) as $r) $done[$r['ex_id']] = true;
$count = fn($s) => count(array_filter(exercises_of($s), fn($e) => isset($done[$e['id']])));

page_head('B SQL 실습실', $u, 'sql.php');
?>
  <span class="step">B 데이터베이스: SQL 실습실</span>
  <h1><?= h($S['title']) ?></h1>
  <nav class="tabs">
    <?php foreach (SQL_SETS as $k => $v): if ($u['teacher'] && in_array($k, ['shared', 'mydb'], true)) continue; ?>
      <a href="sql.php?set=<?= $k ?>"<?= $k === $set ? ' aria-current="page"' : '' ?>><?= h($v['title']) ?> <small>(<?= $count($k) ?>/<?= count(exercises_of($k)) ?>)</small></a>
    <?php endforeach; ?>
  </nav>
  <p><?= h($S['intro']) ?></p>
  <p class="muted">여기서 쓴 SQL은 인터넷을 지나 서버로 가고, 서버의 프로그램이 DB 파일에 물어 결과 표만 돌려보냅니다. 3강의 브라우저 SQL 실습실은 DB가 내 브라우저 안에 있었다는 점이 다릅니다.</p>

  <div class="cols">
    <div>
      <div class="card sqlbox">
        <div id="exbox" class="notice ok" hidden></div>
        <textarea id="sql" spellcheck="false" aria-label="SQL"><?= h($S['starter']) ?></textarea>
        <div class="row" style="margin-top:.5rem">
          <button id="run">실행 <small>(Ctrl+Enter)</small></button>
          <button id="grade" class="ghost" hidden>채점</button>
          <?php if ($set === 'mydb'): ?><button id="reset" class="danger small" type="button">내 DB 처음으로 되돌리기</button><?php endif; ?>
          <span id="took" class="muted"></span>
        </div>
      </div>
      <div id="out" class="result"></div>
    </div>
    <div>
      <h2 style="margin-top:0">문제</h2>
      <?php foreach ($exs as $e): $ok = isset($done[$e['id']]); ?>
      <div class="ex<?= $ok ? ' done' : '' ?>" data-ex="<?= h($e['id']) ?>" data-check="<?= isset($e['check']) ? 1 : 0 ?>">
        <span class="badge <?= $ok ? 'ok' : '' ?>"><?= h(strtoupper($e['id'])) ?> <?= $ok ? '완료' : '' ?></span>
        <span class="q"><?= h($e['ask']) ?></span>
        <div class="row" style="margin-top:.35rem">
          <button class="small ghost pick" type="button"><?= isset($e['check']) ? '다 했으면 확인' : '이 문제 풀기' ?></button>
          <details><summary class="meta">힌트</summary><pre><?= h($e['hint']) ?></pre></details>
        </div>
      </div>
      <?php endforeach; ?>
      <h2>테이블과 칸</h2>
      <div id="schema" class="card muted">불러오는 중…</div>
      <?php if ($set === 'shared'): ?>
      <h2>우리 반 기록 <small class="muted">(최근 20건, 10초마다 새로 받음)</small></h2>
      <div id="live" class="card">불러오는 중…</div>
      <?php endif; ?>
    </div>
  </div>

<script>
(function () {
  var SET = <?= json_encode($set) ?>, ME = <?= json_encode($u['id']) ?>;
  var sql = document.getElementById('sql'), out = document.getElementById('out'), took = document.getElementById('took');
  var exbox = document.getElementById('exbox'), gradeBtn = document.getElementById('grade'), current = null;
  function post(action, data) {
    var fd = new FormData(); fd.append('csrf', window.LAB_CSRF);
    Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
    return fetch('api.php?action=' + action, { method: 'POST', body: fd }).then(function (r) { return r.json(); });
  }
  function el(tag, text, cls) { var e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
  function table(r) {
    var wrap = el('div', null, 'scroll'), t = el('table', null, 'grid'), th = el('thead'), tr = el('tr');
    r.columns.forEach(function (c) { tr.appendChild(el('th', c)); }); th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    r.rows.forEach(function (row) { var tr = el('tr'); row.forEach(function (v) { var td = el('td', v === null ? 'NULL' : String(v)); if (v === null) td.className = 'muted'; td.title = v === null ? '' : String(v); tr.appendChild(td); }); tb.appendChild(tr); });
    t.appendChild(tb); wrap.appendChild(t); return wrap;
  }
  function show(j) {
    out.innerHTML = '';
    if (!j.ok) { out.appendChild(el('div', j.error, 'err')); return; }
    j.results.forEach(function (r, i) {
      var box = el('div', null, 'card');
      if (j.results.length > 1) box.appendChild(el('pre', r.sql));
      if (r.error) box.appendChild(el('div', r.error, 'err'));
      else if (r.columns && r.columns.length) {
        box.appendChild(el('div', r.rows.length + '줄' + (r.more ? ' (앞의 300줄만 보냄)' : '') + ', 서버에서 ' + r.ms + 'ms', 'msg'));
        box.appendChild(table(r));
      } else box.appendChild(el('div', '실행했습니다. 바뀐 줄: ' + r.changes + ' (' + r.ms + 'ms)', 'msg'));
      out.appendChild(box);
    });
  }
  function run() {
    var t0 = performance.now(); took.textContent = '서버에 보내는 중…';
    post('sql', { set: SET, sql: sql.value }).then(function (j) {
      took.textContent = '왕복 ' + Math.round(performance.now() - t0) + 'ms'; show(j);
      if (SET === 'shared') live(); if (SET === 'mydb') schema();
    }).catch(function () { took.textContent = '서버와 연결이 끊겼습니다.'; });
  }
  document.getElementById('run').onclick = run;
  sql.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Tab') { e.preventDefault(); var s = sql.selectionStart; sql.setRangeText('  ', s, sql.selectionEnd, 'end'); }
  });
  function grade(id, withSql) {
    post('check', { ex: id, sql: withSql ? sql.value : '' }).then(function (j) {
      var box = document.querySelector('[data-ex="' + id + '"]');
      if (j.pass) {
        box.classList.add('done'); var b = box.querySelector('.badge'); b.classList.add('ok'); b.textContent = id.toUpperCase() + ' 완료';
        exbox.hidden = false; exbox.className = 'notice ok'; exbox.textContent = id.toUpperCase() + ' 정답입니다.';
      } else { exbox.hidden = false; exbox.className = 'notice warn'; exbox.textContent = id.toUpperCase() + ': ' + (j.why || j.error || '아직 아닙니다.'); }
    });
  }
  document.querySelectorAll('.ex .pick').forEach(function (b) {
    b.onclick = function () {
      var box = b.closest('.ex'), id = box.dataset.ex;
      if (box.dataset.check === '1') { grade(id, false); return; }
      current = id; gradeBtn.hidden = false;
      exbox.hidden = false; exbox.className = 'notice ok'; exbox.textContent = id.toUpperCase() + ' ' + box.querySelector('.q').textContent + '  → SQL을 쓰고 [실행]으로 결과를 본 뒤 [채점]을 누르세요.';
      sql.focus(); window.scrollTo({ top: sql.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
    };
  });
  gradeBtn.onclick = function () { if (current) grade(current, true); };
  var reset = document.getElementById('reset');
  if (reset) reset.onclick = function () {
    if (!confirm('내 DB를 지우고 목록 DB의 새 복사본으로 바꿀까요? 내가 만든 테이블과 고친 내용이 모두 사라집니다.')) return;
    post('mydb_reset', {}).then(function () { location.reload(); });
  };
  function schema() {
    fetch('api.php?action=schema&set=' + SET).then(function (r) { return r.json(); }).then(function (j) {
      var box = document.getElementById('schema'); box.innerHTML = ''; box.classList.remove('muted');
      Object.keys(j.tables || {}).forEach(function (t) {
        var d = el('details'), s = el('summary'); s.appendChild(el('code', t)); d.appendChild(s);
        d.appendChild(el('div', j.tables[t].join(', '), 'muted')); box.appendChild(d);
      });
    });
  }
  schema();
  function live() {
    var box = document.getElementById('live'); if (!box) return;
    post('sql', { set: 'shared', sql: "SELECT r.id, r.student, b.title, r.tag, r.note, r.created_at FROM reading_log r LEFT JOIN book b ON b.id = r.book_id ORDER BY r.id DESC LIMIT 20" }).then(function (j) {
      box.innerHTML = '';
      if (!j.ok || !j.results[0] || j.results[0].error) { box.textContent = '불러오지 못했습니다.'; return; }
      var r = j.results[0];
      if (!r.rows.length) { box.textContent = '아직 기록이 없습니다. 첫 기록을 넣어 보세요.'; return; }
      var ul = el('ul');
      r.rows.forEach(function (x) {
        var li = el('li'); li.appendChild(el('b', x[1] + ' ')); li.appendChild(document.createTextNode((x[2] || '(없는 책 번호)') + (x[3] ? ' #' + x[3] : '') + (x[4] ? ': ' + x[4] : '') + ' '));
        if (x[1] === ME) { var del = el('button', '지우기', 'small ghost'); del.onclick = function () { post('mylog_delete', { id: x[0] }).then(live); }; li.appendChild(del); }
        ul.appendChild(li);
      });
      box.appendChild(ul);
    });
  }
  if (SET === 'shared') { live(); setInterval(live, 10000); }
})();
</script>
<?php page_foot();
