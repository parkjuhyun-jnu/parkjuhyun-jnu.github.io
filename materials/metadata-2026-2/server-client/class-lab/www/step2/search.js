// 2단계: 이 파일은 서버에 놓여 있지만, 실행하는 곳은 여러분의 폰(브라우저)입니다.
// 하는 일: ① 서버에서 books.csv를 통째로 받는다 ② 폰의 메모리에 담는다 ③ 찾을 때마다 폰이 직접 비교한다.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var books = [];   // [번호, 책이름, 지은이, 출판사, 펴낸해, 쪽수, 연령, 갈래, 연구회링크]

  // CSV 한 줄씩 읽기 (따옴표로 감싼 칸 안의 쉼표·줄바꿈도 처리)
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false;
    text = text.replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.length > 1; });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mark(s, q) {
    s = esc(s);
    if (!q) return s;
    var i = s.toLowerCase().indexOf(esc(q).toLowerCase());
    return i < 0 ? s : s.slice(0, i) + '<mark>' + s.slice(i, i + esc(q).length) + '</mark>' + s.slice(i + esc(q).length);
  }
  function kb(n) { return n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; }

  function fill(sel, values) {
    values.forEach(function (v) { var o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o); });
  }

  function search() {
    var t0 = performance.now();
    var q = $('q').value.trim().toLowerCase(), field = $('field').value, age = $('age').value, genre = $('genre').value;
    var hits = books.filter(function (b) {
      if (age && b[6].split(', ').indexOf(age) < 0) return false;
      if (genre && b[7].split(', ').indexOf(genre) < 0) return false;
      if (!q) return true;
      var hay = field === 'all' ? [b[1], b[2], b[3]] : [b[+field]];
      return hay.some(function (h) { return h.toLowerCase().indexOf(q) >= 0; });
    });
    var ms = performance.now() - t0;
    $('s-time').textContent = ms < 1 ? '1ms 미만' : ms.toFixed(1) + 'ms';
    var show = hits.slice(0, 100), raw = $('q').value.trim();
    $('summary').textContent = (q || age || genre ? '찾은 책 ' : '전체 ') + hits.length.toLocaleString() + '권' + (hits.length > 100 ? ' (앞의 100권만 보여 줍니다)' : '');
    $('list').innerHTML = show.map(function (b) {
      return '<li><div class="t">' + mark(b[1], field === 'all' || field === '1' ? raw : '') + '</div>' +
        '<div class="m">' + mark(b[2], field === 'all' || field === '2' ? raw : '') + ' · ' + mark(b[3], field === 'all' || field === '3' ? raw : '') + ' · ' + esc(b[4]) + '</div>' +
        '<div class="m"><span class="tag">' + esc(b[6]) + '</span><span class="tag">' + esc(b[7]) + '</span>' +
        (b[8] ? ' <a href="' + esc(b[8]) + '" target="_blank" rel="noopener">연구회 소개 보기</a>' : '') + '</div></li>';
    }).join('');
  }

  fetch('books.csv', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);
      rows.shift();                       // 첫 줄은 머리글(번호, 책이름, …)
      books = rows;
      $('s-size').textContent = kb(new Blob([text]).size);
      $('s-count').textContent = books.length.toLocaleString() + '권';
      var ages = {}, genres = {};
      books.forEach(function (b) {
        b[6].split(', ').forEach(function (a) { if (a) ages[a] = 1; });
        b[7].split(', ').forEach(function (g) { if (g) genres[g] = 1; });
      });
      fill($('age'), Object.keys(ages).sort(function (a, b) { return parseInt(a) - parseInt(b); }));
      fill($('genre'), Object.keys(genres).sort());
      $('status').className = 'notice ok';
      $('status').innerHTML = '목록을 다 받았습니다. 이제부터 찾기는 <b>내 폰</b>이 합니다.';
      $('stats').hidden = $('f').hidden = false;
      search();
    })
    .catch(function () {
      $('status').innerHTML = '<b>목록 파일이 아직 서버에 없습니다.</b><br>교수님이 <code>books.csv</code>를 이 폴더(<code>step2</code>)에 올리면, 새로고침했을 때 찾기 칸이 나타납니다.';
    });

  $('f').addEventListener('submit', function (e) { e.preventDefault(); search(); });
  ['q', 'field', 'age', 'genre'].forEach(function (id) { $(id).addEventListener(id === 'q' ? 'input' : 'change', search); });
})();
