/* 하네스 설계 실습실 (resources-ai-harness.html)
   입력은 이 브라우저(localStorage)에만 저장하고, 서버로 보내지 않습니다.
   결과 파일 묶음(zip)은 브라우저 안에서 바로 만듭니다(압축 없이 담기만 함). */
(function () {
  'use strict';
  var KEY = 'harness-lab-v1', QA_KEY = 'harness-lab-qa-v1', CODE_KEY = 'harness-lab-code-v1';
  var KIND = { game: '게임', webtoon: '웹툰', picturebook: '그림책' };
  var UNIT = { game: '장면', webtoon: '컷', picturebook: '장면' };
  var ROLES = [
    { k: 'story', name: 'story', game: '서사: 세계관과 사건의 인과, 장면 흐름', other: '서사: 인과와 갈등, 회차 구성' },
    { k: 'continuity', name: 'continuity', game: '설정 감수: 정본, 인물별 지식, 시간 순서가 맞는지', other: '설정 감수: 외형, 시간, 인물별 지식, 관계가 정본과 맞는지' },
    { k: 'dialogue', name: 'dialogue', game: '대사: NPC 대사와 화면 문구, 호칭과 말투', other: '대사: 화자, 호칭, 말투' },
    { k: 'board', name: 'design', game: '장면 설계: 장면 배치, 선택지, 흐름도', other: '콘티: 구도, 행동, 말풍선 자리' },
    { k: 'art', name: 'maker', game: '아트와 코드: 화면, 에셋, 게임 코드', other: '작화: 정본 시트를 보고 글자 없는 그림' },
    { k: 'quality', name: 'quality', game: '독립 품질: 끝까지 플레이해 보고 판정(만든 담당이 아닐 것)', other: '독립 품질: 끝까지 읽어 보고 판정(만든 담당이 아닐 것)' }
  ];
  function steps(kind) {
    var g = kind === 'game';
    return ['사람이 초안을 쓴다', '설정 확인과 구상', g ? '장면 설계' : '대본과 콘티', g ? '아트와 코드 지시' : '작화 지시',
      g ? '게임 만들기' : '컷(장면)별 작화', g ? '화면 문구 앉히기' : '글자 앉히기(조판)', '독립 검수', '최종 승인', '공개'];
  }
  var DEFAULT_BANS = '남의 작품, 캐릭터, 실존 인물을 빌리거나 흉내 내지 않는다.\n정본과 다른 내용이 필요하면 만들기 전에 멈추고 사람에게 묻는다.\n미해결 사항에 있는 것은 지어내지 않고 미상으로 둔다.\n만든 담당이 자기 결과물을 통과시키지 않는다.';
  var DEFAULT_KEEP = '작업 대화\n검수 기록과 결정 기록\n초안과 버린 판본\n개인정보';
  var DEFAULT_PUB = '본편(공개판) HTML\n작품 소개 페이지\n제작 방법 설명(하네스 요약)';

  var uid = function (p) { return p + Math.random().toString(36).slice(2, 8); };
  function newChar() { return { id: uid('c'), name: '', aliases: '', look: '', personality: '', voice: '', relations: '' }; }
  function newEvent() { return { id: uid('e'), what: '', where: '', know: {}, note: '' }; }
  function blank() {
    return {
      kind: 'game', title: '', logline: '', audience: '', owner: '', credit: '',
      chars: [newChar()], events: [], unknowns: [],
      roles: { story: true, continuity: true, dialogue: true, board: true, art: true, quality: true },
      rules: { maxAgents: 4, retries: 2, minFont: 16, width: 360, unit: '장면 3~4개, 장면마다 선택지 2~3개, 10분 안에 끝나는 분량' },
      bans: DEFAULT_BANS, gates: [true, false, true, false, false, false, false, true, true],
      keepIn: DEFAULT_KEEP, publish: DEFAULT_PUB
    };
  }
  function sample() {
    var s = blank();
    s.title = '마감 10분 전';
    s.logline = '대학도서관 마감 10분 전, 근로학생 서윤이 반납함에서 사라진 책 한 권을 찾아 나서는 짧은 텍스트 어드벤처.';
    s.audience = '문헌정보학과 신입생, 휴대폰으로 쉬는 시간에 한 번 해 보는 사람';
    s.owner = '실습자';
    s.credit = '실습자 × AI 공동작업. 등장인물과 책 제목은 모두 지어낸 것입니다.';
    s.chars = [
      { id: 'c1', name: '서윤', aliases: '주인공, 서윤 씨', look: '동그란 갈색 테 안경, 어깨에 닿는 단발, 초록 카디건', personality: '꼼꼼하고 책임감이 강하지만 서두르면 말이 빨라진다', voice: '존댓말, 짧게 끊어 말함. "제가 찾아볼게요."', relations: '한정은의 근로학생, 도윤과는 얼굴만 아는 사이' },
      { id: 'c2', name: '한정은', aliases: '한 선생님, 자료실 사서', look: '은발 단발, 검은 뿔테 안경, 남색 정장 조끼', personality: '차분하고 기록을 중시한다', voice: '부드러운 존댓말. "목록에는 있는데요."', relations: '서윤의 담당 사서' },
      { id: 'c3', name: '도윤', aliases: '열람실 단골', look: '회색 후드, 목에 건 큰 헤드폰, 노트북', personality: '느긋하고 친절하다', voice: '반말 섞인 친근한 말투. "금방 나갈게."', relations: '서윤과 얼굴만 아는 사이' }
    ];
    s.events = [
      { id: 'e1', what: '오후 5시쯤 반납된 『바다를 건너는 지도』가 반납함에서 사라졌다', where: '1장면', know: { c1: '안다', c2: '안다', c3: '모른다' }, note: '' },
      { id: 'e2', what: '도윤이 서고 끝 책상에서 파란 표지 책을 봤다', where: '3장면', know: { c1: '모른다', c2: '모른다', c3: '일부만 안다' }, note: '도윤은 책 제목을 모른다' }
    ];
    s.unknowns = [
      { what: '책을 서고 끝으로 옮긴 사람', note: '게임 안에서 밝히지 않는다' },
      { what: '도윤의 전공', note: '' }
    ];
    s.rules.unit = '장면 4개, 장면마다 선택지 2개, 10분 안에 끝나는 분량';
    return s;
  }

  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { S = blank(); }
  var base = blank();
  Object.keys(base).forEach(function (k) { if (S[k] === undefined) S[k] = base[k]; });

  var $ = function (q, r) { return (r || document).querySelector(q); };
  var $$ = function (q, r) { return Array.prototype.slice.call((r || document).querySelectorAll(q)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lines(t) { return String(t || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); ks.reduce(function (a, k) { return a[k]; }, o)[last] = v; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function kindWord() { return KIND[S.kind] || '콘텐츠'; }
  function titleOr() { return S.title.trim() || '(제목 미정)'; }
  function josa(w, a, b) { var k = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return k >= 0 && k < 11172 ? (k % 28 ? a : b) : a + '(' + b + ')'; }
  function charName(c) { return c.name.trim() || '(이름 없음)'; }

  /* ---------- 폼 그리기 ---------- */
  function fillStatic() {
    $$('[data-k]').forEach(function (el) {
      var v = getPath(S, el.dataset.k);
      if (el.type === 'radio') el.checked = el.value === v; else el.value = v == null ? '' : v;
    });
  }
  function field(list, i, f, label, val, ph, area) {
    var a = 'data-list="' + list + '" data-i="' + i + '" data-f="' + f + '"';
    return '<label class="hl-f"><span>' + label + '</span>' + (area
      ? '<textarea rows="2" ' + a + ' placeholder="' + esc(ph) + '">' + esc(val) + '</textarea>'
      : '<input type="text" ' + a + ' value="' + esc(val) + '" placeholder="' + esc(ph) + '">') + '</label>';
  }
  function renderChars() {
    $('#hl-chars').innerHTML = S.chars.map(function (c, i) {
      return '<div class="hl-item"><div class="hl-item__head"><b>인물 ' + (i + 1) + '</b>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-del="chars" data-i="' + i + '">빼기</button></div><div class="hl-grid">' +
        field('chars', i, 'name', '대표 이름(표목)', c.name, '예: 서윤') +
        field('chars', i, 'aliases', '다른 이름(쉼표로)', c.aliases, '예: 주인공, 서윤 씨') +
        field('chars', i, 'look', '바뀌지 않는 외형', c.look, '예: 동그란 갈색 테 안경, 단발, 초록 카디건', true) +
        field('chars', i, 'personality', '성격', c.personality, '예: 꼼꼼하지만 서두르면 말이 빨라진다', true) +
        field('chars', i, 'voice', '말투와 예시 대사', c.voice, '예: 존댓말, 짧게. "제가 찾아볼게요."', true) +
        field('chars', i, 'relations', '관계', c.relations, '예: 한정은의 근로학생', true) +
        '</div></div>';
    }).join('') || '<p class="hl-empty">아직 인물이 없습니다.</p>';
  }
  var KNOW = ['', '안다', '일부만 안다', '모른다'];
  function renderEvents() {
    $('#hl-events').innerHTML = S.events.map(function (ev, i) {
      var know = S.chars.map(function (c) {
        var v = ev.know[c.id] || '';
        return '<label class="hl-know"><span>' + esc(charName(c)) + '</span><select data-list="events" data-i="' + i + '" data-know="' + c.id + '">' +
          KNOW.map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + (k || '정하지 않음') + '</option>'; }).join('') + '</select></label>';
      }).join('');
      return '<div class="hl-item"><div class="hl-item__head"><b>사건 ' + (i + 1) + '</b>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-del="events" data-i="' + i + '">빼기</button></div><div class="hl-grid">' +
        field('events', i, 'what', '일어난 일', ev.what, '예: 반납된 책이 반납함에서 사라졌다', true) +
        field('events', i, 'where', '어디에서(회차, 장면)', ev.where, '예: 1장면') +
        '</div><p class="hl-sub">누가 이 일을 아는가</p><div class="hl-knows">' + (know || '<span class="hl-empty">인물을 먼저 적으세요.</span>') + '</div>' +
        field('events', i, 'note', '메모', ev.note, '예: 도윤은 책 제목을 모른다') + '</div>';
    }).join('') || '<p class="hl-empty">아직 사건이 없습니다. 이야기의 첫 사건부터 적어 보세요.</p>';
  }
  function renderUnknowns() {
    $('#hl-unknowns').innerHTML = S.unknowns.map(function (u, i) {
      return '<div class="hl-row">' + field('unknowns', i, 'what', '아직 정하지 않은 것', u.what, '예: 책을 옮긴 사람') +
        field('unknowns', i, 'note', '메모', u.note, '예: 게임 안에서 밝히지 않는다') +
        '<button type="button" class="btn btn--ghost btn--sm" data-del="unknowns" data-i="' + i + '" aria-label="미해결 사항 ' + (i + 1) + ' 빼기">빼기</button></div>';
    }).join('') || '<p class="hl-empty">아직 없습니다.</p>';
  }
  function renderRoles() {
    var g = S.kind === 'game';
    $('#hl-roles').innerHTML = ROLES.map(function (r) {
      return '<label class="hl-check"><input type="checkbox" data-role="' + r.k + '"' + (S.roles[r.k] ? ' checked' : '') + '> <span>' + esc(g ? r.game : r.other) + '</span></label>';
    }).join('');
  }
  function renderGates() {
    $('#hl-gates').innerHTML = steps(S.kind).map(function (t, i) {
      return '<label class="hl-check"><input type="checkbox" data-gate="' + i + '"' + (S.gates[i] ? ' checked' : '') + '> <span><b>' + (i + 1) + '</b> ' + esc(t) + '</span></label>';
    }).join('');
  }
  function renderAll() { fillStatic(); renderChars(); renderEvents(); renderUnknowns(); renderRoles(); renderGates(); update(); }

  /* ---------- 입력 받기 ---------- */
  var lab = $('#lab');  // 입력 칸과 [예시 불러오기], [처음부터] 단추를 모두 품은 절
  lab.addEventListener('input', onInput);
  lab.addEventListener('change', onInput);
  function onInput(e) {
    var t = e.target, d = t.dataset;
    if (d.k) {
      if (t.type === 'radio') { if (!t.checked) return; S[d.k] = t.value; renderRoles(); renderGates(); }
      else setPath(S, d.k, t.type === 'number' ? (parseInt(t.value, 10) || 0) : t.value);
    } else if (d.list && d.know) {
      S.events[+d.i].know[d.know] = t.value;
    } else if (d.list) {
      S[d.list][+d.i][d.f] = t.value;
      if (d.list === 'chars' && d.f === 'name') renderEvents();
    } else if (d.role) { S.roles[d.role] = t.checked; }
    else if (d.gate) { S.gates[+d.gate] = t.checked; }
    else return;
    save(); update();
  }
  lab.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.del) {
      S[b.dataset.del].splice(+b.dataset.i, 1);
      if (b.dataset.del === 'chars') { renderChars(); renderEvents(); }
      else if (b.dataset.del === 'events') renderEvents(); else renderUnknowns();
    } else if (b.id === 'hl-add-char') { S.chars.push(newChar()); renderChars(); renderEvents(); }
    else if (b.id === 'hl-add-event') { S.events.push(newEvent()); renderEvents(); }
    else if (b.id === 'hl-add-unknown') { S.unknowns.push({ what: '', note: '' }); renderUnknowns(); }
    else if (b.id === 'hl-sample') {
      if (!confirmReplace()) return;
      S = sample(); renderAll(); flash('예시 설계 「마감 10분 전」을 불러왔습니다.');
    } else if (b.id === 'hl-reset') {
      if (!confirm('적은 내용을 모두 지우고 처음부터 할까요?')) return;
      S = blank(); renderAll(); flash('처음 상태로 비웠습니다.');
    } else return;
    save(); update();
  });
  function confirmReplace() {
    var has = S.title.trim() || S.chars.some(function (c) { return c.name.trim(); });
    return !has || confirm('지금 적은 내용 대신 예시를 불러올까요? 적은 내용은 사라집니다.');
  }
  function flash(msg) { var n = $('#hl-flash'); n.textContent = msg; n.hidden = false; clearTimeout(flash.t); flash.t = setTimeout(function () { n.hidden = true; }, 3500); }

  /* ---------- 결과 파일 만들기 ---------- */
  function q(s) { return JSON.stringify(String(s || '').trim()); }
  function liveChars() { return S.chars.filter(function (c) { return c.name.trim() || c.look.trim(); }); }
  function files() {
    var ks = kindWord(), u = UNIT[S.kind] || '장면', r = S.rules, owner = S.owner.trim() || '사람(작가)';
    var chars = liveChars(), st = steps(S.kind);
    var roleLines = ROLES.filter(function (x) { return S.roles[x.k]; }).map(function (x) { return '- ' + x.name + ': ' + (S.kind === 'game' ? x.game : x.other); });
    var agents = [
      '# 「' + titleOr() + '」 제작 하네스', '',
      '이 폴더는 ' + ks + ' 「' + titleOr() + '」을 만드는 작업실이다. 모든 AI 담당은 일을 시작하기 전에 이 파일과 아래 세 층의 기록을 먼저 읽는다.', '',
      '## 작품', '- 한 줄 소개: ' + (S.logline.trim() || '(미정)'), '- 독자(플레이어): ' + (S.audience.trim() || '(미정)'),
      '- 기준 화면: 휴대폰 폭 ' + r.width + 'px', '- 표기: ' + (S.credit.trim() || '(미정)'), '',
      '## 기억은 세 층의 파일에 있다',
      '1. `canon/characters.yaml`: 고정 정본. 인물의 대표 이름, 다른 이름, 바뀌지 않는 외형, 성격, 말투, 관계. 사람이 승인하지 않으면 고치지 않는다.',
      '2. `story/events.yaml`, `story/unresolved.md`: 승인된 사건과 인물별로 아는 것(known_by), 아직 정하지 않은 것(미상). 새 사건은 사람이 승인한 것만 더한다.',
      '3. `production/`: 판본마다 쌓이는 결정 기록(`decisions.md`)과 검수 기록(`reviews.md`).',
      '- 새 대화를 시작하면 세 층을 먼저 읽고 어제 작업을 잇는다.', '',
      '## 역할', '- 총괄(루트): 일을 나누고, 기록을 잇고, 필요한 담당만 부른다.'].concat(roleLines, [
      '- 결정권은 ' + owner + '에게 있다. AI의 제안은 사람이 채택하기 전까지 미정이다.', '',
      '## 규칙(숫자로 적는다)',
      '- 한 작업에 부르는 담당은 최대 ' + r.maxAgents + '명.',
      '- 같은 ' + u + '을 다시 만드는 것은 ' + r.retries + '회까지. 넘으면 멈추고 사람에게 묻는다.',
      '- 화면 글자는 ' + r.width + 'px 폭에서 ' + r.minFont + 'px 이상.',
      '- ' + r.width + 'px 화면에서 확대 없이 끝까지 ' + (S.kind === 'game' ? '플레이해' : '읽어') + ' 보기 전에는 통과가 아니다.',
      '- 한 번에 만드는 분량: ' + (r.unit.trim() || '(미정)') + '.', '',
      '## 하지 말 것'], lines(S.bans).map(function (x) { return '- ' + x; }), ['',
      '## 관문: 사람이 승인해야 넘어가는 단계'], st.map(function (t, i) { return (i + 1) + '. ' + t + (S.gates[i] ? ' **[사람 승인]**' : ''); }), [
      '- 수정이 생기면 영향받는 단계로 되돌아간다.',
      '- 승인은 검수한 그 판본에만 붙는다. 정본이 바뀌면 예전 승인은 다시 받는다.', '',
      '## 검수',
      '- 검수는 만든 담당이 아닌 다른 담당(또는 다른 AI 대화)이 한다.',
      '- 정본과 실제 결과물을 직접 열어 비교한다. 보지 못한 항목은 `미검토`로 적고 통과시키지 않는다.',
      '- 결함은 `production/reviews.md`에 번호, 등급, 위치, 근거와 함께 숨기지 않고 적는다.',
      '- 코드로 검사할 것(파일 형식, 빠진 칸, 공개 목록)과 사람이 판단할 것(이야기 의도, 외형, 대사의 감정, 휴대폰 가독성)을 나눈다.', '',
      '## 공개 경계', '- 밖으로 내는 것은 `release/allowlist.txt`에 적힌 것뿐이다.',
      '- 안에 남길 것: ' + (lines(S.keepIn).join(', ') || '(미정)'), '']).join('\n');

    var yaml = ['# 고정 정본(canon). 사람이 승인하지 않으면 고치지 않는다.', '# 한 인물은 하나의 대표 이름(표목)으로 적고, 다른 이름은 aliases에 모은다.', '# look_fixed는 어느 ' + u + ', 어느 옷에서도 바뀌지 않는 외형이다.', 'characters:'];
    if (!chars.length) yaml.push('  []');
    chars.forEach(function (c, i) {
      var al = c.aliases.split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
      yaml.push('  - id: c' + (i + 1), '    name: ' + q(c.name), '    aliases: [' + al.map(q).join(', ') + ']',
        '    look_fixed: ' + q(c.look), '    personality: ' + q(c.personality), '    voice: ' + q(c.voice), '    relations: ' + q(c.relations));
    });

    var ev = ['# 승인된 사건과 인물별로 아는 것(known_by).', '# 일어난 일과 각 인물이 아는 일을 따로 적는다. 정하지 않은 칸은 지어내지 않는다.', 'events:'];
    if (!S.events.length) ev.push('  []');
    S.events.forEach(function (e, i) {
      ev.push('  - id: e' + (i + 1), '    what: ' + q(e.what), '    where: ' + q(e.where), '    known_by:');
      if (!chars.length) ev.push('      {}');
      chars.forEach(function (c) { ev.push('      ' + q(c.name || '(이름 없음)') + ': ' + q(e.know[c.id] || '정하지 않음')); });
      if (e.note.trim()) ev.push('    note: ' + q(e.note));
    });

    var un = ['# 미해결 사항', '', '아직 정하지 않은 것이다. 여기 있는 것은 `미상`으로 두고 AI가 지어내지 않는다. 정하면 사람이 승인한 뒤 정본이나 사건 기록으로 옮긴다.', '',
      '| 무엇 | 지금 상태 | 메모 |', '|---|---|---|'];
    var us = S.unknowns.filter(function (x) { return x.what.trim(); });
    us.forEach(function (x) { un.push('| ' + x.what.trim().replace(/\|/g, '/') + ' | 미상 | ' + x.note.trim().replace(/\|/g, '/') + ' |'); });
    if (!us.length) un.push('| (아직 없음) | | |');

    var dec = ['# 결정 기록', '', '누가, 언제, 어느 판본에 대해, 무엇을 결정했는지 적는다. 승인은 검수한 그 판본에만 붙는다.', '',
      '| 날짜 | 판본 | 결정 | 근거 | 결정한 사람 |', '|---|---|---|---|---|',
      '| ' + today() + ' | 하네스 v1 | 하네스를 처음 만듦 | 하네스 설계 실습실에서 작성 | ' + owner + ' |'].join('\n');
    var rev = ['# 검수 기록', '', '검수는 만든 담당이 아닌 다른 담당이 한다. 정본과 실제 결과물을 직접 열어 비교하고, 보지 못한 항목은 `미검토`로 적는다. 결함은 숨기지 않는다.', '',
      '| 번호 | 등급(높음, 보통, 낮음) | 위치 | 무엇이 다른가 | 근거(정본, 판본) | 판정 |', '|---|---|---|---|---|---|',
      '| W01 | (예) 낮음 | (예) 3' + u + ' 배경 | (예) 벽시계 시각이 앞 ' + u + '보다 이르다 | (예) 시험판 v1 | (예) 공개는 막지 않음, 기록 |'].join('\n');
    var allow = ['# 공개 허용 목록: 여기 적힌 것만 밖으로 낸다. 적히지 않은 것은 모두 안에 남는다.', '# 안에 남길 것: ' + (lines(S.keepIn).join(', ') || '(미정)')].concat(lines(S.publish)).join('\n');
    var readme = ['# ' + titleOr() + ' 하네스 묶음', '',
      '박주현 웹사이트 자료실의 하네스 설계 실습실에서 ' + today() + '에 만든 묶음입니다.', '',
      '## 쓰는 법',
      '- **Claude Code나 Codex처럼 폴더를 읽는 에이전트**: 이 폴더에서 시작합니다. Codex는 `AGENTS.md`를, Claude Code는 `CLAUDE.md`(안에서 `AGENTS.md`를 불러옴)를 먼저 읽습니다.',
      '- **ChatGPT, Gemini, Claude 같은 대화형 AI**: 실습실의 [한 장 지시문 복사] 단추로 모든 파일을 한 번에 붙여 넣거나, 이 파일들을 첨부합니다. 새 대화를 열 때마다 다시 줍니다.', '',
      '## 파일', '- `AGENTS.md`: 역할, 규칙, 관문, 검수, 공개 경계', '- `canon/characters.yaml`: 인물 정본(전거 레코드)', '- `story/events.yaml`: 사건과 인물별 지식',
      '- `story/unresolved.md`: 미해결 사항', '- `production/decisions.md`: 결정 기록', '- `production/reviews.md`: 검수 기록', '- `release/allowlist.txt`: 공개 허용 목록', ''].join('\n');
    return [
      { path: 'AGENTS.md', text: agents },
      { path: 'CLAUDE.md', text: '@AGENTS.md\n\n<!-- Claude Code가 먼저 읽는 파일입니다. 내용은 AGENTS.md 한 곳에만 적습니다. -->\n' },
      { path: 'canon/characters.yaml', text: yaml.join('\n') + '\n' },
      { path: 'story/events.yaml', text: ev.join('\n') + '\n' },
      { path: 'story/unresolved.md', text: un.join('\n') + '\n' },
      { path: 'production/decisions.md', text: dec + '\n' },
      { path: 'production/reviews.md', text: rev + '\n' },
      { path: 'release/allowlist.txt', text: allow + '\n' },
      { path: 'README.md', text: readme }
    ];
  }
  function onePrompt() {
    var fs = files().filter(function (f) { return f.path !== 'CLAUDE.md' && f.path !== 'README.md'; });
    return ['아래는 내가 만들려는 ' + kindWord() + ' 「' + titleOr() + '」의 제작 하네스(일하는 방식과 기록)다.',
      '이 대화에서 너는 총괄 편집자다. 아래 파일 내용을 정본으로 삼고, AGENTS.md의 역할, 규칙, 관문을 지켜라.',
      '지금은 아무것도 만들지 말고, 읽었다는 표시로 (1) 인물마다 바뀌면 안 되는 것 한 줄, (2) 미상으로 둘 것 목록, (3) 하네스에서 모순이나 빈칸으로 보이는 것만 답해 줘.', '']
      .concat(fs.map(function (f) { return '===== ' + f.path + ' =====\n' + f.text.trim() + '\n'; })).join('\n');
  }

  /* ---------- 자동 점검(코드가 검사할 것) ---------- */
  function checks() {
    var out = [], chars = liveChars(), seen = {};
    var push = function (lv, t) { out.push({ lv: lv, t: t }); };
    if (!S.title.trim()) push('warn', '제목이 비어 있습니다.');
    if (!chars.length) push('warn', '정본에 인물이 없습니다. 주인공부터 한 명 적으세요.');
    chars.forEach(function (c, i) {
      var n = c.name.trim(), lab = n || '인물 ' + (i + 1);
      if (!n) push('warn', '인물 ' + (i + 1) + '의 대표 이름(표목)이 비어 있습니다.');
      if (n) { if (seen[n]) push('warn', '대표 이름 「' + n + '」이 두 번 나옵니다. 한 인물은 한 레코드에만 적습니다.'); seen[n] = (seen[n] || 0) + 1; }
      if (!c.look.trim()) push('warn', lab + ': 바뀌지 않는 외형이 비어 있으면 ' + (UNIT[S.kind] || '장면') + '마다 모습이 흔들립니다.');
      if (!c.voice.trim()) push('info', lab + ': 말투와 예시 대사를 적어 두면 대사 담당이 흔들리지 않습니다.');
    });
    var owner = {};
    chars.forEach(function (c) { if (c.name.trim()) owner[c.name.trim()] = c.name.trim(); });
    chars.forEach(function (c) {
      c.aliases.split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (a) {
        if (owner[a] && owner[a] !== c.name.trim()) push('warn', '다른 이름 「' + a + '」이 다른 인물과 겹칩니다(' + owner[a] + ', ' + (c.name.trim() || '이름 없음') + '). 전거가 충돌합니다.');
        else owner[a] = c.name.trim();
      });
    });
    if (!S.events.length) push('info', '사건이 없습니다. 이미 정한 첫 사건을 적으면 누가 무엇을 아는지 함께 정할 수 있습니다.');
    S.events.forEach(function (e, i) {
      if (!e.what.trim()) push('warn', '사건 ' + (i + 1) + ': 일어난 일이 비어 있습니다.');
      var empty = chars.filter(function (c) { return !e.know[c.id]; }).map(charName);
      if (empty.length) push('warn', '사건 ' + (i + 1) + ': ' + empty.join(', ') + '이(가) 이 일을 아는지 정하지 않았습니다.');
    });
    if (!S.unknowns.some(function (u) { return u.what.trim(); })) push('info', '미해결 사항이 없습니다. 정하지 않은 것을 적어 두면 AI가 지어내지 않습니다.');
    if (!S.roles.quality) push('warn', '독립 품질 담당이 없습니다. 만든 AI에게 물으면 대개 잘됐다고 답합니다.');
    if (!S.gates[8]) push('warn', '공개 단계에 사람 승인이 없습니다.');
    if (!S.gates[7]) push('warn', '최종 승인 단계에 사람 승인이 없습니다.');
    if (S.rules.minFont < 14) push('warn', '휴대폰 화면 글자가 ' + S.rules.minFont + 'px이면 읽기 어렵습니다. 16px 안팎을 권합니다.');
    if (S.rules.retries > 5) push('info', '다시 만들기 ' + S.rules.retries + '회는 많습니다. 몇 번에서 사람에게 넘길지 정하는 것이 규칙의 뜻입니다.');
    if (!S.credit.trim()) push('warn', 'AI와 함께 만들었다는 표기 문구가 비어 있습니다.');
    var pub = lines(S.publish).join(' ');
    if (/검수|승인|결정 기록|대화|개인정보|초안|production/.test(pub)) push('warn', '공개 허용 목록에 내부 기록으로 보이는 말이 있습니다. 안에 남길 것인지 다시 보세요.');
    if (!lines(S.publish).length) push('warn', '공개 허용 목록이 비어 있습니다.');
    return out;
  }

  /* ---------- 결과 보이기 ---------- */
  var current = 'AGENTS.md', timer;
  function update() { clearTimeout(timer); timer = setTimeout(renderOut, 120); }
  function renderOut() {
    var fs = files();
    $('#hl-tabs').innerHTML = fs.map(function (f) { return '<button type="button" class="chip" aria-pressed="' + (f.path === current) + '" data-file="' + esc(f.path) + '">' + esc(f.path) + '</button>'; }).join('');
    var f = fs.filter(function (x) { return x.path === current; })[0] || fs[0];
    $('#hl-view').textContent = f.text;
    var cs = checks(), warns = cs.filter(function (c) { return c.lv === 'warn'; }).length;
    $('#hl-checks-sum').textContent = warns ? '고칠 것 ' + warns + '개' + (cs.length > warns ? ', 권하는 것 ' + (cs.length - warns) + '개' : '') : (cs.length ? '고칠 것 없음, 권하는 것 ' + cs.length + '개' : '모두 통과');
    $('#hl-checks-sum').className = 'hl-sum ' + (warns ? 'is-warn' : 'is-ok');
    $('#hl-checks').innerHTML = cs.map(function (c) { return '<li class="' + c.lv + '">' + esc(c.t) + '</li>'; }).join('') || '<li class="ok">빠진 칸이나 충돌이 없습니다. 이제 사람이 판단할 차례입니다.</li>';
    renderPrompts();
  }
  $('#hl-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-file]'); if (b) { current = b.dataset.file; renderOut(); } });

  /* ---------- 내려받기와 복사 ---------- */
  var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function makeZip(list) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0, d = new Date();
    var tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    list.forEach(function (f) {
      var name = enc.encode(f.path), data = enc.encode(f.text), crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
      h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    });
    var size = central.reduce(function (a, b) { return a + b.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, list.length, true); e.setUint16(10, list.length, true);
    e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  function zipBlob() { return makeZip(files().map(function (f) { return { path: 'harness/' + f.path, text: f.text }; })); }
  window.harnessLab = { files: files, zipBlob: zipBlob, checks: checks, onePrompt: onePrompt };
  $('#hl-zip').addEventListener('click', function () {
    var url = URL.createObjectURL(zipBlob()), a = document.createElement('a');
    a.href = url; a.download = 'harness-' + today().replace(/-/g, '') + '.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  });
  function copy(text, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = '복사했습니다'; setTimeout(function () { btn.textContent = o; }, 1600); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove(); }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var w = b.dataset.copy;
    if (w === 'all') copy(onePrompt(), b);
    else if (w === 'file') copy($('#hl-view').textContent, b);
    else { var el = document.getElementById(w); if (el) copy(el.textContent, b); }
  });

  /* ---------- 실습 2의 프롬프트(설계 내용을 넣어 만듦) ---------- */
  function renderPrompts() {
    var r = S.rules, chars = liveChars(), first = chars[0] ? charName(chars[0]) : '주인공', second = chars[1] ? charName(chars[1]) : first;
    var parallel = S.kind !== 'game' ? '\n- 이 게임은 ' + kindWord() + ' 본편과 다른 "평행 세계"로 둔다. 게임에서 생긴 일은 정본과 사건 기록에 넣지 않는다.' : '';
    var knows = chars.length ? chars.map(function (c) { return charName(c) + ' (안다/모른다)'; }).join(', ') : '인물마다 (안다/모른다)';
    $('#p-draft').textContent = [
      '1단계 초안이야. 이 초안은 내가 승인한다.',
      '- 1장면(장소, 시각): (누가 무엇을 알리고, ' + first + josa(first, '이', '가') + ' 무엇을 하려 하는가). 선택: (가) / (나)',
      '- 2장면(장소): (무슨 일이 일어나는가). 선택: (가) / (나)',
      '- 3장면(장소): (누구를 만나고 무엇을 듣는가). 선택: (가) / (나)',
      '- 4장면(장소): (결말 몇 개와 각 결말의 조건). 미상인 것은 끝까지 밝히지 않는다.',
      '- (시간이나 점수처럼 게임이 세는 것이 있으면 규칙을 적는다)',
      '- 새 사건이 생기면 승인한다: "(일어난 일)", (장면), known_by: ' + knows,
      '이 초안으로 2단계와 3단계(장면 설계)를 진행해서 장면 설계를 표로 보여 줘. 내가 승인하면 그때 코드를 만들어.'].join('\n');
    $('#p-build').textContent = [
      '내가 승인한 초안과 장면 설계대로, 하네스를 지켜서 「' + titleOr() + '」의 정본과 사건 기록으로 브라우저 미니 게임(텍스트 어드벤처)의 첫 시험판을 만들어 줘.',
      '- 브라우저에서 바로 열리는 HTML 파일 하나로 만든다. 외부 라이브러리, 외부 이미지, 인터넷 연결 없이 돌아가게 한다.',
      '- 휴대폰 ' + r.width + 'px 폭에서 확대 없이 할 수 있게 하고, 글자는 ' + r.minFont + 'px 이상으로 한다.',
      '- 분량: ' + (r.unit.trim() || '장면 3~4개, 장면마다 선택지 2~3개') + '.',
      '- 정본에 없는 외형이나 설정은 지어내지 말고, 필요하면 만들기 전에 나에게 묻는다. 미해결 사항은 미상으로 둔다.',
      '- 인물은 사건 기록의 known_by에서 모른다고 한 일을 말하지 않는다.',
      '- 화면 아래에 "' + (S.credit.trim() || '○○ × AI 공동작업') + '" 표기를 넣는다.' + parallel,
      '- 다 만들면 코드 전체를 한 번에 보여 주고, 내가 결정해야 할 것을 decisions.md 표의 한 줄 형식으로 적어 줘.'].join('\n');
    $('#p-feedback').textContent = [
      '"너무 급해. 첫 장면에서 ' + first + josa(first, '이', '가') + ' 왜 서두르는지 한 줄 더 보여 주고 다시 짜 봐."',
      '"선택지 가운데 정답이 너무 뻔해 보여. 두 선택지가 모두 그럴듯하게 고쳐 줘. 다른 것은 바꾸지 마."',
      '"' + r.width + 'px 화면에서 버튼 글자가 두 줄로 넘어가. 문구만 줄여 줘."',
      '"' + second + '의 말투가 정본과 달라. 정본의 말투 예시에 맞춰 대사만 고쳐 줘."'].join('\n');
    $('#p-review').textContent = [
      '너는 이 게임을 만들지 않은 독립 검수 담당이다. 아래에 정본(canon), 사건 기록, 미해결 사항, 게임 코드를 붙인다.',
      '1. 게임 코드를 끝까지 따라가며 모든 선택지를 한 번씩 고른다고 보고, 정본과 다른 곳을 찾는다: 인물 이름과 다른 이름, 외형 묘사, 말투, 인물이 모르는 일을 말하는 곳(known_by), 미상인 것을 지어낸 곳.',
      '2. 휴대폰 ' + r.width + 'px 폭에서 글자가 ' + r.minFont + 'px 이상인지 코드로 확인한다.',
      '3. 실제로 확인한 항목만 판정한다. 확인하지 못한 항목은 "미검토"라고 적고 통과시키지 않는다.',
      '4. 결함은 표로 적는다: 번호(W01부터), 등급(높음, 보통, 낮음), 위치, 무엇이 다른가, 근거.',
      '5. 마지막에 "공개 가능", "고친 뒤 공개", "공개 불가" 가운데 하나로 판정하고 이유를 한 줄로 적는다.',
      '고치는 코드는 쓰지 말고 판정만 한다.'].join('\n');
    $$('[data-fill="width"]').forEach(function (el) { el.textContent = r.width; });
  }

  /* ---------- 플레이 시험장 ---------- */
  var code = $('#play-code'), frame = $('#play-frame'), box = $('#play-box');
  try { code.value = localStorage.getItem(CODE_KEY) || ''; } catch (e) {}
  code.addEventListener('input', function () { try { localStorage.setItem(CODE_KEY, code.value.slice(0, 400000)); } catch (e) {} });
  function run() {
    if (!code.value.trim()) { $('#play-msg').textContent = '먼저 AI가 만든 HTML 코드를 붙여 넣으세요.'; return; }
    $('#play-msg').textContent = '';
    frame.srcdoc = code.value;
  }
  $('#play-run').addEventListener('click', run);
  function loadGame(url, what) {
    if (code.value.trim() && !confirm('붙여 넣은 코드 대신 ' + what + ' 불러올까요?')) return;
    fetch(url).then(function (r) { if (!r.ok) throw r; return r.text(); }).then(function (t) {
      code.value = t; try { localStorage.setItem(CODE_KEY, t); } catch (e) {} run();
      $('#play').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function () { $('#play-msg').textContent = what + ' 불러오지 못했습니다.'; });
  }
  $('#play-sample').addEventListener('click', function () { loadGame('assets/files/harness-sample-game.html', '예시 게임을'); });
  var trialBtn = $('#trial-load');
  if (trialBtn) trialBtn.addEventListener('click', function () { loadGame('assets/files/harness-trial-gpt-v2.html', 'AI 시험판 v2를'); });
  $('#play-clear').addEventListener('click', function () { code.value = ''; frame.srcdoc = ''; try { localStorage.removeItem(CODE_KEY); } catch (e) {} });
  $$('[data-w]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-w]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      box.style.width = b.dataset.w === 'full' ? '100%' : b.dataset.w + 'px';
    });
  });

  /* ---------- 공개 전 점검표 ---------- */
  var qa = {};
  try { qa = JSON.parse(localStorage.getItem(QA_KEY)) || {}; } catch (e) {}
  var items = $$('#qa input[type=checkbox]');
  function qaCount() { $('#qa-count').textContent = items.filter(function (x) { return x.checked; }).length + ' / ' + items.length; }
  items.forEach(function (x, i) {
    x.checked = !!qa[i];
    x.addEventListener('change', function () { qa[i] = x.checked; try { localStorage.setItem(QA_KEY, JSON.stringify(qa)); } catch (e) {} qaCount(); });
  });
  qaCount();

  renderAll();
})();
