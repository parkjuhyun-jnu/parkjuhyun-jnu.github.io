/* ==========================================================================
   메타데이터 어휘 실습 6개. 서버·가입 없음. 실습 6의 입력만 이 브라우저에 저장한다.
   예시 값 가운데 수업용으로 만든 것은 화면에 표시한다.
   ========================================================================== */
(() => {
  const PAGE = 'materials/metadata-2026-2/vocabulary/lab.html';
  const app = document.getElementById('app');
  const tabs = document.getElementById('tabs');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const xmlEsc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const $ = (sel, root = app) => root.querySelector(sel);
  const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
  const parseXml = (text) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const err = doc.querySelector('parsererror');
    return { doc, ok: !err, msg: err ? err.textContent.trim().split('\n').slice(0, 2).join(' ') : '' };
  };
  const NS = {
    dc: 'http://purl.org/dc/elements/1.1/',
    dcterms: 'http://purl.org/dc/terms/',
    dct: 'http://purl.org/dc/terms/',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    foaf: 'http://xmlns.com/foaf/0.1/',
    xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  };
  const DC15 = ['title', 'creator', 'subject', 'description', 'publisher', 'contributor', 'date', 'type', 'format', 'identifier', 'source', 'language', 'relation', 'coverage', 'rights'];
  const LAB = {
    1: { title: '세 도구 가려내기', run: lab1 },
    2: { title: '15개 요소 채우기', run: lab2 },
    3: { title: '덤 다운 시험', run: lab3 },
    4: { title: '트리플과 그래프', run: lab4 },
    5: { title: '네임스페이스', run: lab5 },
    6: { title: '내 요소세트', run: lab6 },
  };

  function route() {
    const n = LAB[location.hash.slice(1)] ? location.hash.slice(1) : '1';
    tabs.innerHTML = Object.keys(LAB).map((k) => `<li><a href="${PAGE}#${k}" aria-current="${k === n}">실습 ${k} · ${LAB[k].title}</a></li>`).join('');
    document.title = `실습 ${n} ${LAB[n].title} | 박주현`;
    app.oninput = app.onclick = app.onchange = null; // 앞 실습이 걸어 둔 처리기를 지운다
    LAB[n].run();
    const top = tabs.getBoundingClientRect().top + scrollY - 90;
    if (scrollY > top) scrollTo(0, top);
  }
  addEventListener('hashchange', route);

  const nextLink = (n) => (LAB[n + 1]
    ? `<a class="btn" href="${PAGE}#${n + 1}">다음: 실습 ${n + 1} →</a>`
    : `<a class="btn" href="materials/metadata-2026-2/vocabulary/">이론과 실습 안내로</a>`);

  /* ---------- 실습 1 ---------- */
  function lab1() {
    const KIND = { c: '내용규칙', v: '어휘 인코딩스킴', s: '구문 인코딩스킴' };
    const Q = [
      { t: '크기는 세로×가로를 센티미터 단위로 적는다.', a: 'c', why: '값을 어떻게 적을지 정한 규칙입니다.' },
      { t: '도서관 목록은 KCR에 따라 기술한다.', a: 'c', why: 'KCR(한국목록규칙)은 RDA와 함께 대표적인 내용규칙입니다.' },
      { t: '표제는 한국어로 작성하는 것을 원칙으로 한다.', a: 'c', why: '값의 언어를 정한 규칙입니다.' },
      { t: '주제 칸의 값은 LCSH에서 고른다.', a: 'v', why: 'LCSH는 주제명표목표입니다. 정해진 목록에서 낱말을 고릅니다.' },
      { t: '예술가 이름은 ULAN에 있는 이름을 쓴다.', a: 'v', why: 'ULAN은 예술가명 통합 목록입니다. 여러 표기를 대표 이름 하나로 모읍니다.' },
      { t: '분류기호는 DDC에서 가져온다.', a: 'v', why: 'DDC라는 목록에서 값을 고르므로 어휘 인코딩스킴입니다.' },
      { t: '자원의 유형은 DCMI Type Vocabulary에서 고른다.', a: 'v', why: '이름 그대로 어휘입니다. DC terms에 어휘 인코딩스킴으로 등록되어 있습니다.' },
      { t: '날짜는 W3CDTF에 따라 2024-06-09 모양으로 쓴다.', a: 's', why: '낱말이 아니라 모양을 정합니다.' },
      { t: '좌표는 DCMI Point 형식으로 적는다.', a: 's', why: '공간정보를 적는 모양을 정합니다.' },
      { t: '이 칸의 값은 URI 형식으로 적는다.', a: 's', why: 'DC terms에서 URI는 구문 인코딩스킴으로 등록되어 있습니다.' },
    ];
    let order = shuffle(Q), idx = 0, score = 0, missed = false;
    const res = [];
    function draw() {
      if (idx >= order.length) return finish();
      const q = order[idx];
      missed = false;
      app.innerHTML = `<p class="lab-intro">세 도구는 답하는 질문이 다릅니다. <b>어떻게 적을까</b>(내용규칙), <b>어떤 낱말을 고를까</b>(어휘 인코딩스킴), <b>어떤 모양으로 쓸까</b>(구문 인코딩스킴).</p>
        <div class="stage">
          <div class="pips" aria-label="${order.length}문제 중 ${idx + 1}번째">${order.map((_, i) => `<i class="${i < idx ? (res[i] ? 'ok' : 'miss') : i === idx ? 'now' : ''}"></i>`).join('')}</div>
          <p class="card-q">${esc(q.t)}</p>
          <div class="choice">${Object.keys(KIND).map((k) => `<button type="button" data-k="${k}">${KIND[k]}</button>`).join('')}</div>
          <p class="say" id="say" aria-live="polite"></p>
          <div class="btn-row" id="nx"></div>
        </div>`;
      $('.choice').addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b || b.disabled) return;
        const say = $('#say');
        if (b.dataset.k !== q.a) {
          missed = true;
          b.classList.add('wrong');
          b.disabled = true;
          say.className = 'say no';
          say.textContent = `${KIND[b.dataset.k]}은(는) ‘${{ c: '어떻게 적을까', v: '어떤 낱말을 고를까', s: '어떤 모양으로 쓸까' }[b.dataset.k]}’에 답하는 도구입니다. 이 문장에 맞나요?`;
          return;
        }
        b.classList.add('right');
        $$('.choice button').forEach((o) => { o.disabled = true; });
        say.className = 'say ok';
        say.textContent = q.why;
        res[idx] = !missed;
        if (!missed) score++;
        $('#nx').innerHTML = `<button class="btn" type="button" id="go">${idx === order.length - 1 ? '결과 보기' : '다음 문장 →'}</button>`;
        $('#go').onclick = () => { idx++; draw(); };
        $('#go').focus();
      });
    }
    function finish() {
      app.innerHTML = `<div class="stage" style="text-align:center">
        <p class="tally" style="font-size:1.8rem;margin:.2rem 0">${order.length}문제 중 ${score}개</p>
        <p>${score === order.length ? '셋을 정확히 가려내고 있습니다.' : '한 번에 맞힌 수입니다. 낱말을 고르면 어휘, 모양을 정하면 구문, 적는 방법이면 내용규칙입니다.'}</p>
        <div class="btn-row" style="justify-content:center"><button class="btn btn--ghost" type="button" id="again">다시 하기</button>${nextLink(1)}</div>
      </div>`;
      $('#again').onclick = lab1;
    }
    draw();
  }

  /* ---------- 실습 2 ---------- */
  function lab2() {
    const V = [
      { v: '어린 왕자', a: 'title', no: '책에 붙은 이름입니다.' },
      { v: '생텍쥐페리', a: 'creator', no: '작품을 쓴 사람입니다. 주된 책임은 어느 칸일까요?' },
      { v: '김화영 (옮긴이)', a: 'contributor', no: '옮긴이는 쓴 사람은 아니지만 기여했습니다.' },
      { v: '문학동네', a: 'publisher', no: '자원을 이용할 수 있게 내놓은 쪽입니다.' },
      { v: '2007', a: 'date', no: '이 판이 나온 때입니다.' },
      { v: '텍스트', a: 'type', no: 'JPEG나 종이책 같은 형식이 아니라 자원의 유형입니다.' },
      { v: '종이책', a: 'format', no: '유형이 아니라 물리적 매체입니다.' },
      { v: '프랑스 소설', a: 'subject', no: '무엇에 관한 자원인지를 적는 칸입니다.' },
      { v: 'ISBN 9788954603096', a: 'identifier', no: '공식적으로 부여된 번호입니다.' },
      { v: 'kor', a: 'language', no: '이 판을 적은 말입니다.' },
      { v: 'Le Petit Prince (원서)', a: 'source', no: '이 번역본이 파생되어 나온 원래 자원입니다.' },
      { v: '같은 작품의 다른 번역본', a: 'relation', no: '파생의 원본은 아니지만 관련된 자원입니다.' },
    ];
    const GROUPS = [['내용', ['title', 'subject', 'description', 'type', 'source', 'relation', 'coverage']], ['지적재산권', ['creator', 'contributor', 'publisher', 'rights']], ['인스턴스화', ['date', 'format', 'identifier', 'language']]];
    const KO = { title: '표제', subject: '주제', description: '설명', type: '유형', source: '출처', relation: '관련자원', coverage: '수록범위', creator: '창작자', contributor: '기여자', publisher: '발행자', rights: '저작권', date: '날짜', format: '형식', identifier: '식별자', language: '언어' };
    const opts = '<option value="">칸 고르기</option>' + GROUPS.map(([g, els]) => `<optgroup label="${g}">${els.map((e) => `<option value="${e}">${e} ${KO[e]}</option>`).join('')}</optgroup>`).join('');
    const list = shuffle(V);
    app.innerHTML = `<p class="lab-intro">『어린 왕자』 문학동네판을 더블린 코어로 기술합니다(값은 수업용 예시). 값마다 알맞은 칸을 고르면 오른쪽 메시지와 아래 XML이 바로 바뀝니다.</p>
      <div class="stage">
        <h3>값을 칸에 넣기 <span class="tally" id="t2"></span></h3>
        ${list.map((x, i) => `<div class="field-row"><span class="val">${esc(x.v)}</span><select data-i="${i}" aria-label="${esc(x.v)}의 칸">${opts}</select><span class="msg" id="m${i}"></span></div>`).join('')}
      </div>
      <div class="stage">
        <h3>만들어진 XML</h3>
        <pre class="code" id="x2" tabindex="0"></pre>
        <p class="say" id="p2" aria-live="polite"></p>
      </div>`;
    function update() {
      let right = 0;
      const lines = [];
      $$('select').forEach((s) => {
        const x = list[+s.dataset.i], m = $('#m' + s.dataset.i);
        if (!s.value) { m.textContent = ''; m.className = 'msg'; return; }
        lines.push([s.value, x.v]);
        if (s.value === x.a) { right++; m.textContent = '맞습니다.'; m.className = 'msg ok'; } else { m.textContent = x.no; m.className = 'msg no'; }
      });
      $('#t2').textContent = `${right} / ${list.length}`;
      const xml = `<metadata xmlns:dc="${NS.dc}">\n${lines.map(([e, v]) => `  <dc:${e}>${xmlEsc(v)}</dc:${e}>`).join('\n')}${lines.length ? '\n' : ''}</metadata>`;
      $('#x2').textContent = xml;
      const p = parseXml(xml), say = $('#p2');
      if (!p.ok) { say.className = 'say no'; say.textContent = '브라우저가 XML을 읽지 못했습니다: ' + p.msg; return; }
      if (right === list.length) {
        say.className = 'say ok';
        say.innerHTML = `브라우저의 XML 해석기가 읽었고 ${list.length}개가 모두 맞습니다. 칸 세 개(description, coverage, rights)는 비어 있어도 괜찮습니다. 더블린 코어의 모든 칸은 선택이니까요. 순서가 뒤섞여 있어도 됩니다.<div class="btn-row">${nextLink(2)}</div>`;
      } else {
        say.className = 'say';
        say.textContent = '브라우저의 XML 해석기가 이 코드를 읽을 수 있습니다. 나머지 칸도 채워 보세요.';
      }
    }
    app.onchange = (e) => { if (e.target.matches('select')) update(); };
    update();
  }

  /* ---------- 실습 3 ---------- */
  function lab3() {
    const DATA = [
      { el: '표제', q: 'title', sub: 'alternative', ko: '대체표제', v: '천년의 미소' },
      { el: '수록범위', q: 'coverage', sub: 'spatial', ko: '공간적 범위', v: '광주' },
      { el: '수록범위', q: 'coverage', sub: 'temporal', ko: '시간적 범위', v: '1980년대' },
      { el: '날짜', q: 'date', sub: 'modified', ko: '수정일', v: '2001-07-18' },
    ];
    const JUDGE = [
      { sub: 'title.alternative', v: '천년의 미소', el: '표제', ok: true, why: '표제로 읽어도 이 그림을 가리키는 이름이니 뜻이 통합니다.' },
      { sub: 'title.price', v: '12,000원', el: '표제', ok: false, why: '값이 표제로 읽혀 “표제: 12,000원”이 됩니다. 가격은 표제의 한 종류가 아닙니다.' },
      { sub: 'coverage.spatial', v: '광주', el: '수록범위', ok: true, why: '수록범위로 읽어도 틀리지 않습니다.' },
      { sub: 'creator.birthYear', v: '1900', el: '창작자', ok: false, why: '“창작자: 1900”이 됩니다. 출생연도는 창작자가 아니라 창작자에 대한 다른 사실입니다.' },
      { sub: 'date.issued', v: '2007', el: '날짜', ok: true, why: '발행일은 날짜의 한 종류이므로 그냥 날짜로 읽어도 맞습니다.' },
    ];
    const CONVERT = [
      { lab: '<dc:date>2001-07-18</dc:date>', hint: '이 값은 그 웹페이지를 마지막으로 고친 날입니다.', ask: '상세구분', opts: ['created', 'modified', 'issued'], a: 'modified', ask2: '인코딩스킴', opts2: ['W3CDTF', 'DDC', 'URI'], a2: 'W3CDTF', out: '<dcterms:modified xsi:type="dcterms:W3CDTF">2001-07-18</dcterms:modified>' },
      { lab: '<dc:subject>062</dc:subject>', hint: '062는 듀이십진분류의 기호입니다.', ask: '상세구분', opts: ['없음'], a: '없음', ask2: '인코딩스킴', opts2: ['W3CDTF', 'DDC', 'URI'], a2: 'DDC', out: '<dc:subject xsi:type="dcterms:DDC">062</dc:subject>' },
      { lab: '<dc:identifier>http://www.ukoln.ac.uk/</dc:identifier>', hint: '이 값은 웹 주소입니다.', ask: '상세구분', opts: ['없음'], a: '없음', ask2: '인코딩스킴', opts2: ['W3CDTF', 'DDC', 'URI'], a2: 'URI', out: '<dc:identifier xsi:type="dcterms:URI">http://www.ukoln.ac.uk/</dc:identifier>' },
    ];
    app.innerHTML = `<p class="lab-intro"><b>덤 다운 원칙</b>: 상세구분을 모르는 프로그램이 그 말을 무시해도 값의 뜻이 틀리면 안 됩니다. 프로그램을 바꿔 가며 같은 기록이 어떻게 읽히는지 보세요.</p>
      <div class="stage">
        <h3>① 프로그램이 읽는 모습</h3>
        <div class="seg" role="group" aria-label="프로그램 고르기"><button type="button" data-m="1" aria-pressed="true">상세구분을 아는 프로그램</button><button type="button" data-m="0" aria-pressed="false">모르는 프로그램</button></div>
        <ul class="read-list" id="read"></ul>
        <p class="say" id="readsay"></p>
      </div>
      <div class="stage">
        <h3>② 원칙을 지킨 상세구분일까요? <span class="tally" id="t3"></span></h3>
        <p class="small muted" style="margin:0 0 .3rem">price와 birthYear는 문제를 위해 일부러 만든 잘못된 예입니다.</p>
        <div id="judge"></div>
      </div>
      <div class="stage">
        <h3>③ Simple DC를 Qualified DC로 바꾸기</h3>
        <p class="small muted" style="margin:0 0 .3rem">UKOLN 기관을 기술한 사례의 값입니다(Powell &amp; Johnston, 2003).</p>
        <div id="conv"></div>
        <div class="say" id="done3"></div>
      </div>`;
    function drawRead(m) {
      $$('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
      $('#read').innerHTML = [{ el: '표제', ko: '표제', v: '모나리자' }, ...DATA].map((d) => `<li><b>${m === '1' ? d.ko || d.el : d.el}</b> ${esc(d.v)}</li>`).join('');
      $('#readsay').textContent = m === '1' ? '구체적으로 읽습니다. 표제와 대체표제, 공간과 시간을 구별합니다.' : '덜 구체적입니다. 그래도 어느 값도 틀린 말이 되지는 않았습니다.';
    }
    $('.seg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) drawRead(b.dataset.m); });
    drawRead('1');

    let good = 0;
    $('#judge').innerHTML = JUDGE.map((j, i) => `<div class="field-row" data-i="${i}">
        <span><code>${esc(j.sub)}</code>: ${esc(j.v)}</span>
        <span class="choice"><button type="button" data-v="1">지킴</button><button type="button" data-v="0">어김</button></span>
        <span class="msg" aria-live="polite"></span></div>`).join('');
    $('#t3').textContent = `0 / ${JUDGE.length}`;
    $('#judge').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      const row = b.closest('.field-row'), j = JUDGE[+row.dataset.i], msg = $('.msg', row);
      const dumb = `모르는 프로그램은 “${j.el}: ${j.v}”로 읽습니다. `;
      if ((b.dataset.v === '1') === j.ok) {
        b.classList.add('right');
        $$('button', row).forEach((o) => { o.disabled = true; });
        msg.className = 'msg ok';
        msg.textContent = dumb + j.why;
        good++;
        $('#t3').textContent = `${good} / ${JUDGE.length}`;
      } else {
        b.classList.add('wrong');
        b.disabled = true;
        msg.className = 'msg no';
        msg.textContent = dumb + '그렇게 읽어도 뜻이 맞나요?';
      }
    });

    $('#conv').innerHTML = CONVERT.map((c, i) => `<div class="el" data-i="${i}">
        <code>${esc(c.lab)}</code>
        <p class="small muted" style="margin:.25rem 0 .5rem">${esc(c.hint)}</p>
        <div class="el-grid">
          <div><label class="lbl" for="a${i}">${c.ask}</label><select id="a${i}" ${c.opts.length === 1 ? 'disabled' : ''}>${c.opts.length > 1 ? '<option value="">고르기</option>' : ''}${c.opts.map((o) => `<option>${o}</option>`).join('')}</select></div>
          <div><label class="lbl" for="b${i}">${c.ask2}</label><select id="b${i}"><option value="">고르기</option>${c.opts2.map((o) => `<option>${o}</option>`).join('')}</select></div>
        </div>
        <p class="say" aria-live="polite"></p></div>`).join('');
    $('#conv').addEventListener('change', () => {
      let n = 0;
      $$('#conv .el').forEach((box) => {
        const c = CONVERT[+box.dataset.i], [s1, s2] = $$('select', box), say = $('.say', box);
        if (!s2.value || (!s1.disabled && !s1.value)) { say.className = 'say'; say.textContent = ''; return; }
        if (s1.value === c.a && s2.value === c.a2) {
          n++;
          say.className = 'say ok';
          say.innerHTML = `<code>${esc(c.out)}</code>`;
        } else {
          say.className = 'say no';
          say.textContent = s1.value !== c.a ? '수정한 날을 뜻하는 상세구분을 찾아보세요.' : '이 값은 어떤 낱말 목록에서 왔거나 어떤 모양을 따르나요?';
        }
      });
      const d = $('#done3');
      if (n === CONVERT.length) { d.className = 'say ok'; d.innerHTML = `이제 컴퓨터는 수정일이고 W3CDTF 형식이며, 062는 DDC 분류기호이고, 식별자는 URI라는 것까지 압니다.<div class="btn-row">${nextLink(3)}</div>`; } else { d.innerHTML = ''; }
    });
  }

  /* ---------- 실습 4 ---------- */
  const KINDS = { iri: '자원(IRI)', lit: '리터럴', blank: '공백노드' };
  const SEVEN = [
    ['Work ID:M7-123', 'has title', '"Magnificent 7"', 'lit'],
    ['Work ID:M7-123', 'is adaptation of', 'Work ID:S7-324', 'iri'],
    ['Work ID:S7-324', 'has title', '"Shichinin no Samurai"', 'lit'],
    ['Work ID:S7-324', 'has alternate title', '"Seven Samurai"', 'lit'],
    ['Work ID:S7-324', 'has director', 'Person ID:AK-887', 'iri'],
    ['Person ID:AK-887', 'has preferred name', '"Akira Kurosawa"', 'lit'],
  ];
  function lab4() {
    const blank = () => ({ s: '', sk: 'iri', p: '', pk: 'iri', o: '', ok: 'iri' });
    let rows = [{ s: '책 KMO200722491', sk: 'iri', p: '저자', pk: 'iri', o: '생텍쥐페리', ok: 'iri' }, blank(), blank(), blank()];
    const kindSel = (name, v, i, label) => `<select data-f="${name}" data-i="${i}" aria-label="${i + 1}번째 줄 ${label} 종류">${Object.keys(KINDS).map((k) => `<option value="${k}"${k === v ? ' selected' : ''}>${KINDS[k]}</option>`).join('')}</select>`;
    const problems = (r) => {
      const out = [];
      if (r.sk === 'lit') out.push('주어에는 리터럴이 올 수 없습니다.');
      if (r.pk !== 'iri') out.push('술어에는 IRI만 올 수 있습니다.');
      return out;
    };
    app.innerHTML = `<p class="lab-intro">이 문장에는 사실이 몇 개 들어 있을까요? 사실 하나가 트리플 하나입니다. 주어를 책으로 잡고 나머지 줄을 채우면 그래프가 바로 그려집니다.</p>
      <blockquote class="answer" style="margin-top:0">『어린 왕자』 문학동네판은 생텍쥐페리가 쓰고 김화영이 옮겼으며, 2007년에 문학동네에서 나왔다.</blockquote>
      <div class="stage">
        <h3>트리플 쓰기</h3>
        <div id="rows"></div>
        <div class="btn-row">
          <button class="btn btn--ghost btn--sm" type="button" id="add">줄 더하기</button>
          <button class="btn btn--sm" type="button" id="chk">답 확인</button>
          <button class="btn btn--ghost btn--sm" type="button" id="seven">다른 예: 《7인의 사무라이》 불러오기</button>
          <button class="btn btn--ghost btn--sm" type="button" id="clr">처음으로</button>
        </div>
        <div class="say" id="s4" aria-live="polite"></div>
      </div>
      <div class="stage">
        <h3>그래프 <small class="muted" id="count"></small></h3>
        <p class="small muted" style="margin:0">글자가 똑같은 자원은 한 노드로 합쳐집니다. 그래서 트리플이 이어집니다. 리터럴은 값 그 자체라서 합치지 않습니다.</p>
        <div id="g"></div>
        <div class="legend"><span><i></i>자원(IRI)</span><span><i class="l"></i>리터럴</span><span><i class="b"></i>공백노드</span></div>
      </div>
      <p class="src">술어 이름은 수업용이며 실제 어휘가 아닙니다. 책 번호는 국립중앙도서관 LOD 값입니다. 《7인의 사무라이》 예는 Coyle(2010b)의 사례를 교재 2장에서 가져와 표기를 다듬었습니다.</p>`;
    function drawRows() {
      $('#rows').innerHTML = rows.map((r, i) => {
        const p = problems(r);
        return `<div class="triple-row">
          <div class="cell"><label class="lbl" for="s${i}">주어</label><input type="text" id="s${i}" data-f="s" data-i="${i}" value="${esc(r.s)}">${kindSel('sk', r.sk, i, '주어')}</div>
          <div class="cell"><label class="lbl" for="p${i}">술어</label><input type="text" id="p${i}" data-f="p" data-i="${i}" value="${esc(r.p)}">${kindSel('pk', r.pk, i, '술어')}</div>
          <div class="cell"><label class="lbl" for="o${i}">목적어</label><input type="text" id="o${i}" data-f="o" data-i="${i}" value="${esc(r.o)}">${kindSel('ok', r.ok, i, '목적어')}</div>
          <button class="x" type="button" data-del="${i}" aria-label="${i + 1}번째 줄 지우기">×</button>
          <p class="triple-msg" id="tm${i}">${p.join(' ')}</p>
        </div>`;
      }).join('');
    }
    function drawGraph() {
      const done = rows.filter((r) => r.s.trim() && r.p.trim() && r.o.trim() && !problems(r).length);
      $('#count').textContent = `트리플 ${done.length}개`;
      $('#g').innerHTML = graphSvg(done);
    }
    app.oninput = (e) => {
      const f = e.target.dataset && e.target.dataset.f;
      if (!f) return;
      const i = +e.target.dataset.i;
      rows[i][f] = e.target.value;
      $('#tm' + i).textContent = problems(rows[i]).join(' ');
      drawGraph();
    };
    app.onclick = (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { rows.splice(+del.dataset.del, 1); if (!rows.length) rows.push(blank()); drawRows(); drawGraph(); return; }
      if (e.target.id === 'add') { rows.push(blank()); drawRows(); drawGraph(); }
      if (e.target.id === 'clr') { app.oninput = app.onclick = null; lab4(); }
      if (e.target.id === 'seven') {
        rows = SEVEN.map(([s, p, o, ok]) => ({ s, sk: 'iri', p, pk: 'iri', o, ok }));
        drawRows(); drawGraph();
        const say = $('#s4');
        say.className = 'say';
        say.textContent = '구로사와 아키라 감독의 《7인의 사무라이》와 이를 각색한 영화 이야기를 쪼갠 것입니다. 한 문장에 사실이 여섯 개입니다. 《Magnificent 7》에서 출발해 화살표를 따라가면 원작을 거쳐 감독의 이름에 닿습니다. 목적어가 자원이면 다시 주어가 된다는 말이 그림으로 보입니다.';
      }
      if (e.target.id === 'chk') check();
    };
    function check() {
      const say = $('#s4');
      const use = rows.filter((r) => r.s.trim() && r.p.trim() && r.o.trim());
      const miss = [];
      const has = (t) => use.find((r) => r.o.replace(/\s/g, '').includes(t));
      [['생텍쥐페리', '쓴 사람'], ['김화영', '옮긴 사람'], ['문학동네', '펴낸 곳'], ['2007', '펴낸 해']].forEach(([t, n]) => { if (!has(t)) miss.push(n); });
      const bad = use.filter((r) => problems(r).length);
      const subj = new Set(use.map((r) => r.s.trim()));
      if (bad.length) { say.className = 'say no'; say.textContent = '자리 규칙에 어긋난 줄이 있습니다. 빨간 글을 보세요.'; return; }
      if (miss.length) { say.className = 'say no'; say.textContent = `아직 빠진 사실: ${miss.join(', ')}.`; return; }
      const y = has('2007');
      if (y.ok !== 'lit') { say.className = 'say no'; say.textContent = '네 사실을 모두 찾았습니다. 그런데 2007은 값 그 자체입니다. 목적어 종류를 리터럴로 바꿔 보세요.'; return; }
      say.className = 'say ok';
      say.innerHTML = `네 사실을 모두 트리플로 나눴습니다${subj.size > 1 ? ' (주어를 하나로 맞추면 그래프가 한 덩어리로 이어집니다)' : ''}. 사람과 출판사는 번호를 붙여 자원으로 적을 수도, 글자로 적어 리터럴로 둘 수도 있습니다. 자원으로 적으면 그 사람에 대해 다시 설명을 이어 갈 수 있고, 리터럴은 거기서 끝납니다. 《7인의 사무라이》 예도 불러와 보세요.<div class="btn-row">${nextLink(4)}</div>`;
    }
    drawRows();
    drawGraph();
  }
  /* 힘 기반 배치. 난수를 쓰지 않아 같은 입력이면 같은 그림이 나온다 */
  function graphSvg(triples) {
    if (!triples.length) return '<p class="small muted" style="margin:.7rem 0 0">세 칸을 모두 채운 줄이 그래프로 나타납니다.</p>';
    const nodes = new Map();
    const nodeOf = (label, kind, uniq) => {
      const key = kind === 'lit' ? `lit:${uniq}` : `${kind}:${label.trim()}`;
      if (!nodes.has(key)) nodes.set(key, { key, label: label.trim(), kind });
      return nodes.get(key);
    };
    const edges = triples.map((t, i) => ({ a: nodeOf(t.s, t.sk, i), b: nodeOf(t.o, t.ok, i), p: t.p.trim() }));
    const list = [...nodes.values()];
    const W = 760, H = Math.max(240, Math.min(560, 130 + list.length * 42));
    const textW = (s) => [...s].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 12.5 : 7), 0);
    const short = (s) => ([...s].length > 24 ? [...s].slice(0, 23).join('') + '…' : s);
    list.forEach((n, i) => {
      const ang = (i / list.length) * Math.PI * 2 + 0.6;
      n.x = W / 2 + Math.cos(ang) * W * 0.3;
      n.y = H / 2 + Math.sin(ang) * H * 0.32;
      n.w = textW(short(n.label)) + (n.kind === 'lit' ? 18 : 36);
      n.h = 34;
    });
    for (let it = 0; it < 500; it++) {
      const cool = 1 - it / 500;
      list.forEach((n) => { n.dx = 0; n.dy = 0; });
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d = Math.hypot(dx, dy) || 1;
        const min = (a.w + b.w) / 2 + 24;
        const f = 26000 / (d * d) + (d < min ? (min - d) * 0.8 : 0);
        dx /= d; dy /= d;
        a.dx += dx * f; a.dy += dy * f; b.dx -= dx * f; b.dy -= dy * f;
      }
      edges.forEach((e) => {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, d = Math.hypot(dx, dy) || 1;
        const want = (e.a.w + e.b.w) / 2 + 95;
        const f = (d - want) * 0.06;
        e.a.dx += (dx / d) * f; e.a.dy += (dy / d) * f; e.b.dx -= (dx / d) * f; e.b.dy -= (dy / d) * f;
      });
      list.forEach((n) => {
        n.dx += (W / 2 - n.x) * 0.012; n.dy += (H / 2 - n.y) * 0.03;
        const step = Math.min(14, Math.hypot(n.dx, n.dy)) * cool, m = Math.hypot(n.dx, n.dy) || 1;
        n.x += (n.dx / m) * step; n.y += (n.dy / m) * step;
        n.x = Math.max(n.w / 2 + 6, Math.min(W - n.w / 2 - 6, n.x));
        n.y = Math.max(n.h / 2 + 8, Math.min(H - n.h / 2 - 8, n.y));
      });
    }
    const border = (n, tx, ty) => {
      const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy) || 1;
      if (n.kind === 'lit') {
        const k = Math.min((n.w / 2) / (Math.abs(dx) || 1e-6), (n.h / 2) / (Math.abs(dy) || 1e-6));
        return [n.x + dx * k, n.y + dy * k];
      }
      const rx = n.w / 2, ry = n.h / 2, k = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
      return [n.x + dx * k, n.y + dy * k, d];
    };
    const seen = {};
    const eSvg = edges.map((e) => {
      const pair = [e.a.key, e.b.key].sort().join('|');
      seen[pair] = (seen[pair] || 0) + 1;
      const lift = (seen[pair] - 1) * 16;
      const [x1, y1] = border(e.a, e.b.x, e.b.y), [x2, y2] = border(e.b, e.a.x, e.a.y);
      const ang = Math.atan2(y2 - y1, x2 - x1), a = 9, sp = 0.42;
      const p1 = `${x2},${y2}`, p2 = `${x2 - a * Math.cos(ang - sp)},${y2 - a * Math.sin(ang - sp)}`, p3 = `${x2 - a * Math.cos(ang + sp)},${y2 - a * Math.sin(ang + sp)}`;
      return `<line class="edge" x1="${x1}" y1="${y1}" x2="${x2 - 7 * Math.cos(ang)}" y2="${y2 - 7 * Math.sin(ang)}"/><polygon class="arrow" points="${p1} ${p2} ${p3}"/>
        <text class="edge-label" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 5 - lift}" text-anchor="middle">${esc(short(e.p))}</text>`;
    }).join('');
    const nSvg = list.map((n) => {
      const shape = n.kind === 'lit'
        ? `<rect class="lit" x="${n.x - n.w / 2}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" rx="3"/>`
        : `<ellipse class="${n.kind === 'blank' ? 'blank' : 'res'}" cx="${n.x}" cy="${n.y}" rx="${n.w / 2}" ry="${n.h / 2}"/>`;
      return `${shape}<text class="node-label" x="${n.x}" y="${n.y + 4}" text-anchor="middle">${esc(short(n.label))}</text>`;
    }).join('');
    const desc = edges.map((e) => `${e.a.label} ${e.p} ${e.b.label}`).join('. ');
    return `<svg class="graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(desc)}">${eSvg}${nSvg}</svg>`;
  }

  /* ---------- 실습 5 ---------- */
  const BROKEN = `<?xml version="1.0"?>
<metadata
  xmlns="http://example.org/myapp/"
  xmlns:dcterms="http://purl.org/dc/terms/">
  <dc:title>UKOLN</dc:title>
  <dcterms:alternative>UK Office for Library and Information Networking</dcterms:alternative>
  <dc:subject xsi:type="dcterms:DDC">062</dc:subject>
  <dcterms:isPartOf xsi:type="dcterms:URI">http://www.bath.ac.uk/</dcterms:isPartOf>
</metadata>`;
  const AUSTEN = [
    { el: 'title', v: '오만과 편견', iri: null, a: 'lit', why: '이 예에서 표제는 사람이 읽는 글자 그대로 둡니다.' },
    { el: 'creator', v: '제인 오스틴', iri: 'http://lod.nl.go.kr/resource/KAC199601201', a: 'iri', why: '이름 표기가 여럿인 사람은 주소로 가리키면 한 사람으로 모입니다.' },
    { el: 'subject', v: '현대 소설', iri: 'http://lod.nl.go.kr/resource/KSH2000007450', a: 'iri', why: '통제어휘집의 주제어도 주소가 있습니다.' },
    { el: 'identifier', v: 'ISBN 9780140430721', iri: null, a: 'lit', why: '교재의 예에서 ISBN은 글자값으로 둡니다.' },
  ];
  function lab5() {
    app.oninput = app.onclick = null;
    app.innerHTML = `<p class="lab-intro">접두어는 긴 주소의 별명입니다. 짧은 이름과 전체 주소를 오가 보고, 선언이 빠져 읽히지 않는 XML을 고칩니다.</p>
      <div class="stage">
        <h3>① QName과 URI 바꾸기</h3>
        <label class="lbl" for="qn">QName(예: dc:creator)이나 전체 주소를 적어 보세요</label>
        <input type="text" id="qn" value="dcterms:alternative" autocomplete="off" spellcheck="false">
        <p class="say" id="qr" aria-live="polite"></p>
        <div class="btn-row" id="qex">${['dc:creator', 'dcterms:creator', 'dct:creator', 'foaf:maker', 'dc:alternative', 'http://purl.org/dc/terms/provenance'].map((x) => `<button class="btn btn--ghost btn--sm" type="button" data-q="${x}">${x.length > 22 ? x.slice(-22) : x}</button>`).join('')}</div>
      </div>
      <div class="stage">
        <h3>② 접두어 선언이 빠진 XML 고치기</h3>
        <p class="small" style="margin:0 0 .4rem">아래 코드는 접두어 두 개를 선언 없이 썼습니다. 맨 위 <code>metadata</code> 태그 안에 <code>xmlns:접두어="주소"</code>를 더하고 <b>검사</b>를 누르세요.</p>
        <textarea id="fx" rows="10" spellcheck="false" aria-label="고칠 XML"></textarea>
        <div class="btn-row">
          <button class="btn btn--sm" type="button" id="fxgo">검사</button>
          <button class="btn btn--ghost btn--sm" type="button" id="fxhint">주소 힌트</button>
          <button class="btn btn--ghost btn--sm" type="button" id="fxreset">처음 코드로</button>
        </div>
        <div class="say" id="fxr" aria-live="polite"></div>
      </div>
      <div class="stage">
        <h3>③ 글자로 적을까, 주소로 가리킬까: 『오만과 편견』</h3>
        <p class="small" style="margin:0 0 .3rem">교재의 DC terms 예시처럼 값을 골라 보세요. 주소가 무엇을 가리키는지 <a href="https://lod.nl.go.kr/page/KAC199601201" target="_blank" rel="noopener">KAC199601201</a>, <a href="https://lod.nl.go.kr/page/KSH2000007450" target="_blank" rel="noopener">KSH2000007450</a>을 눌러 확인할 수 있습니다.</p>
        <div id="au"></div>
        <pre class="code" id="auxml" tabindex="0"></pre>
        <div class="say" id="aus" aria-live="polite"></div>
      </div>`;
    const qn = $('#qn');
    function conv() {
      const v = qn.value.trim(), out = $('#qr');
      if (!v) { out.textContent = ''; return; }
      const m = /^([A-Za-z][\w-]*):([A-Za-z][\w-]*)$/.exec(v);
      if (m && !v.startsWith('http')) {
        const [, pre, name] = m;
        if (!NS[pre]) { out.className = 'say no'; out.textContent = `접두어 ${pre}는 이 표에 선언되어 있지 않습니다. 실제 코드에서도 먼저 xmlns로 선언해야 씁니다.`; return; }
        out.className = 'say';
        let note = '';
        if (pre === 'dc' && !DC15.includes(name)) note = ` 다만 ${name}은(는) dc의 15개 요소에 없습니다. DC terms 쪽에 있는 이름일 수 있으니 dcterms:${name}을 살펴보세요.`;
        if (pre === 'dct') note = ' dct는 dcterms와 같은 주소를 가리키는 접두어입니다. 접두어가 달라도 주소가 같으면 같은 용어입니다.';
        out.innerHTML = `<code>${esc(NS[pre] + name)}</code><br>${esc(note)}`;
        return;
      }
      const hit = ['dc', 'dcterms', 'rdf', 'foaf', 'xsi'].find((p) => v.startsWith(NS[p]));
      if (hit) { out.className = 'say'; out.innerHTML = `<code>${esc(hit + ':' + v.slice(NS[hit].length))}</code>`; return; }
      out.className = 'say no';
      out.textContent = 'dc, dcterms, dct, rdf, foaf, xsi 접두어나 그 주소로 시작하는 값을 적어 보세요.';
    }
    qn.addEventListener('input', conv);
    $('#qex').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { qn.value = b.dataset.q; conv(); } });
    conv();

    const fx = $('#fx');
    fx.value = BROKEN;
    $('#fxgo').onclick = () => {
      const text = fx.value, res = $('#fxr');
      const declared = {};
      text.replace(/xmlns:([\w-]+)\s*=\s*["']([^"']*)["']/g, (_, p, u) => { declared[p] = u; return _; });
      const used = new Set();
      text.replace(/<\/?([\w-]+):[\w-]+/g, (_, p) => { used.add(p); return _; });
      text.replace(/\s([\w-]+):[\w-]+\s*=/g, (_, p) => { if (p !== 'xmlns' && p !== 'xml') used.add(p); return _; });
      const missing = [...used].filter((p) => !(p in declared));
      if (missing.length) { res.className = 'say no'; res.textContent = `아직 선언하지 않은 접두어: ${missing.join(', ')}. 태그와 속성에 쓴 접두어는 모두 선언해야 합니다.`; return; }
      const wrong = [...used].filter((p) => NS[p] && declared[p] !== NS[p]);
      if (wrong.length) { res.className = 'say no'; res.textContent = `${wrong.join(', ')} 접두어의 주소가 다릅니다. 끝의 빗금까지 정확해야 같은 네임스페이스입니다.`; return; }
      const p = parseXml(text);
      if (!p.ok) { res.className = 'say no'; res.textContent = '접두어 선언은 되었지만 XML 문법이 깨졌습니다: ' + p.msg; return; }
      const rows = [...p.doc.documentElement.children].map((el) => `<li><code>${esc(el.tagName)}</code> → <code>${esc(el.namespaceURI + el.localName)}</code></li>`).join('');
      res.className = 'say ok';
      res.innerHTML = `통과했습니다. 브라우저가 접두어를 실제 주소로 풀어 읽습니다.<ul style="font-weight:400;margin:.4rem 0 0;padding-left:1.2rem">${rows}</ul>`;
    };
    $('#fxhint').onclick = () => {
      const res = $('#fxr');
      res.className = 'say';
      res.innerHTML = `<code>dc</code>는 <code>${NS.dc}</code>, <code>xsi</code>는 <code>${NS.xsi}</code>입니다. xsi는 W3C가 정한 XML 스키마 인스턴스 네임스페이스로, <code>xsi:type</code>을 쓸 때 필요합니다.`;
    };
    $('#fxreset').onclick = () => { fx.value = BROKEN; $('#fxr').textContent = ''; };

    const state = AUSTEN.map(() => '');
    $('#au').innerHTML = AUSTEN.map((a, i) => `<div class="field-row" data-i="${i}">
      <span><code>${a.el}</code> <span class="val">${esc(a.v)}</span></span>
      <span class="choice"><button type="button" data-w="lit">글자</button><button type="button" data-w="iri">주소</button></span>
      <span class="msg"></span></div>`).join('');
    function drawAu() {
      const lines = AUSTEN.map((a, i) => {
        if (!state[i]) return `  <!-- ${a.el}: 아직 고르지 않음 -->`;
        const v = state[i] === 'iri' && a.iri ? a.iri : a.v;
        return `  <dcterms:${a.el}>${xmlEsc(v)}</dcterms:${a.el}>`;
      });
      $('#auxml').textContent = `<metadata xmlns:dcterms="${NS.dcterms}">\n${lines.join('\n')}\n</metadata>`;
      const s = $('#aus');
      if (AUSTEN.every((a, i) => state[i] === a.a)) {
        s.className = 'say ok';
        s.innerHTML = `15개 속성 자체는 같고 값을 적는 방식이 달라졌습니다. 글자는 사람이 읽고, 주소는 기계가 따라갑니다.<div class="btn-row">${nextLink(5)}</div>`;
      } else { s.innerHTML = ''; }
    }
    $('#au').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      const row = b.closest('.field-row'), i = +row.dataset.i, a = AUSTEN[i], msg = $('.msg', row);
      $$('button', row).forEach((o) => o.classList.remove('right', 'wrong'));
      if (b.dataset.w === a.a) {
        state[i] = a.a; b.classList.add('right'); msg.className = 'msg ok'; msg.textContent = a.why;
      } else {
        state[i] = ''; b.classList.add('wrong'); msg.className = 'msg no';
        msg.textContent = a.a === 'iri' ? '글자로도 적을 수 있지만, DCMI는 이 칸을 URI로 식별하기를 권장합니다. 주소가 있는 값입니다.' : '이 예에서는 가리킬 주소를 정해 두지 않았습니다.';
      }
      drawAu();
    });
    drawAu();
  }

  /* ---------- 실습 6 ---------- */
  const TERMS = [
    ['title', 'Title', '자원에 붙인 이름', []],
    ['alternative', 'Alternative Title', '자원의 다른 이름', []],
    ['creator', 'Creator', '자원을 만드는 데 책임이 있는 개체', ['URI']],
    ['contributor', 'Contributor', '자원에 기여한 책임이 있는 개체', ['URI']],
    ['publisher', 'Publisher', '자원을 이용할 수 있게 한 책임이 있는 개체', ['URI']],
    ['subject', 'Subject', '자원의 주제', ['LCSH', 'MESH', 'DDC', 'UDC', 'LCC', 'NLM']],
    ['description', 'Description', '자원에 대한 설명', []],
    ['abstract', 'Abstract', '자원의 요약', []],
    ['date', 'Date', '자원의 생애에서 어떤 사건과 관련된 시점이나 기간', ['W3CDTF']],
    ['created', 'Date Created', '자원이 만들어진 날', ['W3CDTF']],
    ['issued', 'Date Issued', '자원이 공식적으로 발행된 날', ['W3CDTF']],
    ['modified', 'Date Modified', '자원이 수정된 날', ['W3CDTF']],
    ['type', 'Type', '자원의 유형이나 장르', ['DCMIType']],
    ['format', 'Format', '자원의 파일 형식, 물리적 매체, 규격', ['IMT']],
    ['extent', 'Extent', '자원의 크기나 길이', []],
    ['identifier', 'Identifier', '자원에 부여된 공식적인 식별자', ['URI']],
    ['language', 'Language', '자원의 언어', ['ISO639-2', 'RFC5646']],
    ['source', 'Source', '이 자원이 파생되어 나온 원래 자원', ['URI']],
    ['relation', 'Relation', '이 자원과 관련된 자원', ['URI']],
    ['isPartOf', 'Is Part Of', '이 자원을 일부로 포함하는 자원', ['URI']],
    ['coverage', 'Coverage', '자원의 시간적·공간적 범위', []],
    ['spatial', 'Spatial Coverage', '자원의 공간적 범위', ['TGN', 'ISO3166', 'Point', 'Box']],
    ['temporal', 'Temporal Coverage', '자원의 시간적 범위', ['W3CDTF', 'Period']],
    ['rights', 'Rights', '자원의 저작권 정보', []],
    ['license', 'License', '자원을 쓸 수 있게 허락한 법적 문서', ['URI']],
  ].map(([n, l, d, s]) => ({ n, l, d, s }));
  const SYNTAX = ['URI', 'W3CDTF', 'ISO639-2', 'RFC5646', 'ISO3166', 'Point', 'Box', 'Period'];
  const VOCAB = ['LCSH', 'MESH', 'DDC', 'UDC', 'LCC', 'NLM', 'DCMIType', 'IMT', 'TGN'];
  const KEY = 'vocab:my-element-set';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 저장 못 해도 실습은 된다 */ } },
    del() { try { localStorage.removeItem(KEY); } catch { /* 위와 같음 */ } },
  };
  const emptySet = () => ({ object: '', about: '', why: '', els: Array.from({ length: 5 }, () => ({ term: '', name: '', label: '', def: '', comment: '', scheme: '', value: '' })) });
  const EXAMPLE = () => ({
    object: '교정의 은행나무 사진 (수업용 가상 예)', about: 'http://example.org/photo/1',
    why: '값이 제각각이면 찾을 수 없다. 적는 법, 고르는 낱말, 쓰는 모양을 정해 두면 여러 사람이 만든 기록을 모아 찾을 수 있다.',
    els: [
      { term: 'title', name: '', label: '', def: '', comment: '', scheme: '', value: '교정의 은행나무' },
      { term: 'creator', name: '', label: '', def: '', comment: '값은 주소로 적는다', scheme: 'URI', value: 'http://example.org/person/1' },
      { term: 'created', name: '', label: '', def: '', comment: '촬영한 날', scheme: 'W3CDTF', value: '2026-11-05' },
      { term: 'format', name: '', label: '', def: '', comment: '', scheme: 'IMT', value: 'image/jpeg' },
      { term: '_new', name: 'cameraModel', label: 'Camera Model', def: '촬영한 기기의 모델명', comment: '표준에 없어 새로 만든 요소', scheme: '', value: '예시 모델 A1' },
    ],
  });
  const termOf = (e) => TERMS.find((t) => t.n === e.term);
  function resolved(e) {
    const t = termOf(e);
    if (t) return { prefix: 'dcterms', name: t.n, uri: NS.dcterms + t.n, label: t.l, def: e.def || t.d };
    return { prefix: 'my', name: e.name.trim(), uri: 'http://example.org/my/' + e.name.trim(), label: e.label.trim(), def: e.def.trim() };
  }
  const filled = (e) => (e.term === '_new' ? e.name.trim() : e.term) && e.value.trim();
  const isIri = (v) => /^https?:\/\/\S+$/.test(v.trim());
  function warnOf(e) {
    const out = [];
    if (e.term === '_new' && e.name.trim()) {
      if (/\s/.test(e.name)) out.push('요소명에는 띄어쓰기를 쓰지 않습니다. 뒷 단어 첫 글자를 대문자로 올리세요(cameraModel).');
      else if (!/^[A-Za-z][A-Za-z0-9]*$/.test(e.name.trim())) out.push('요소명은 영문자로 시작하고 영문자와 숫자로만 적으세요.');
      else if (/^[A-Z]/.test(e.name.trim())) out.push('요소명은 소문자로 시작합니다. 고유명사로 시작할 때만 대문자를 씁니다.');
      else if (TERMS.some((t) => t.n === e.name.trim())) out.push(`dcterms:${e.name.trim()}이 이미 있습니다. 있는 것은 다시 쓰고, 없는 것만 새로 만듭니다.`);
    }
    const v = e.value.trim();
    if (v && e.scheme === 'URI' && !isIri(v)) out.push('인코딩스킴이 URI이면 값은 http:// 또는 https://로 시작합니다.');
    if (v && e.scheme === 'W3CDTF' && !/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/.test(v)) out.push('W3CDTF는 2026, 2026-11, 2026-11-05 같은 모양입니다.');
    return out;
  }
  function buildXml(set) {
    const els = set.els.filter(filled);
    const hasMy = els.some((e) => e.term === '_new');
    const hasScheme = els.some((e) => e.scheme);
    const body = els.map((e) => {
      const r = resolved(e), attr = e.scheme ? ` xsi:type="dcterms:${e.scheme}"` : '';
      return `  <${r.prefix}:${r.name}${attr}>${xmlEsc(e.value.trim())}</${r.prefix}:${r.name}>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<metadata\n  xmlns:dcterms="${NS.dcterms}"${hasScheme ? `\n  xmlns:xsi="${NS.xsi}"` : ''}${hasMy ? '\n  xmlns:my="http://example.org/my/"' : ''}>\n${body}${body ? '\n' : ''}</metadata>`;
  }
  function buildRdf(set) {
    const els = set.els.filter(filled);
    const hasMy = els.some((e) => e.term === '_new');
    const about = xmlEsc(set.about.trim() || 'http://example.org/my-object').replace(/"/g, '&quot;');
    const body = els.map((e) => {
      const r = resolved(e), v = e.value.trim(), tag = `${r.prefix}:${r.name}`;
      if (isIri(v)) return `    <${tag} rdf:resource="${xmlEsc(v).replace(/"/g, '&quot;')}"/>`;
      if (SYNTAX.includes(e.scheme)) return `    <${tag} rdf:datatype="${NS.dcterms}${e.scheme}">${xmlEsc(v)}</${tag}>`;
      return `    <${tag}>${xmlEsc(v)}</${tag}>${e.scheme ? `  <!-- 어휘: ${e.scheme} -->` : ''}`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<rdf:RDF\n  xmlns:rdf="${NS.rdf}"\n  xmlns:dcterms="${NS.dcterms}"${hasMy ? '\n  xmlns:my="http://example.org/my/"' : ''}>\n  <rdf:Description rdf:about="${about}">\n${body}${body ? '\n' : ''}  </rdf:Description>\n</rdf:RDF>`;
  }
  function lab6() {
    app.oninput = app.onclick = null;
    let set = store.get();
    if (!set || !Array.isArray(set.els)) set = emptySet();
    let view = 'xml';
    const termOpts = (v) => `<option value="">고르기</option><optgroup label="표준을 다시 쓰기 (dcterms)">${TERMS.map((t) => `<option value="${t.n}"${t.n === v ? ' selected' : ''}>${t.n} · ${t.l}</option>`).join('')}</optgroup><option value="_new"${v === '_new' ? ' selected' : ''}>표준에 없음: 새로 만들기 (my:)</option>`;
    const schemeOpts = (v) => `<option value="">없음</option><optgroup label="구문: 어떤 모양?">${SYNTAX.map((s) => `<option${s === v ? ' selected' : ''}>${s}</option>`).join('')}</optgroup><optgroup label="어휘: 어떤 낱말?">${VOCAB.map((s) => `<option${s === v ? ' selected' : ''}>${s}</option>`).join('')}</optgroup>`;
    const elHtml = (e, i) => {
      const t = termOf(e), isNew = e.term === '_new';
      const suggest = t && t.s.length ? `쓸 수 있는 스킴: ${t.s.join(', ')}` : '';
      return `<div class="el" data-i="${i}">
        <div class="el-head"><span>요소 ${i + 1}</span>${set.els.length > 1 ? `<button class="btn btn--ghost btn--sm" type="button" data-del="${i}">지우기</button>` : ''}</div>
        <div class="el-grid">
          <div class="wide"><label class="lbl" for="t${i}">어떤 요소인가요?</label><select id="t${i}" data-k="term">${termOpts(e.term)}</select></div>
          ${isNew ? `<div><label class="lbl" for="n${i}">요소명 (기계용)</label><input type="text" id="n${i}" data-k="name" value="${esc(e.name)}" placeholder="cameraModel" spellcheck="false"></div>
          <div><label class="lbl" for="l${i}">레이블 (사람용)</label><input type="text" id="l${i}" data-k="label" value="${esc(e.label)}" placeholder="Camera Model"></div>` : ''}
          ${t || isNew ? `<div class="wide"><label class="lbl" for="d${i}">정의 (이 칸은 무엇인가, 한 문장)</label><input type="text" id="d${i}" data-k="def" value="${esc(e.def)}" placeholder="${t ? esc(t.d) : '촬영한 기기의 모델명'}"></div>
          <div class="wide"><label class="lbl" for="c${i}">주석 (어떻게 적나)</label><input type="text" id="c${i}" data-k="comment" value="${esc(e.comment)}" placeholder="값을 적는 방법, 쓰는 어휘"></div>
          <div><label class="lbl" for="s${i}">인코딩스킴 ${suggest ? `<span class="muted" style="font-weight:400">${esc(suggest)}</span>` : ''}</label><select id="s${i}" data-k="scheme">${schemeOpts(e.scheme)}</select></div>
          <div><label class="lbl" for="v${i}">값</label><input type="text" id="v${i}" data-k="value" value="${esc(e.value)}" spellcheck="false"></div>` : ''}
          <p class="warn" id="w${i}">${warnOf(e).map(esc).join(' ')}</p>
        </div></div>`;
    };
    app.innerHTML = `<p class="lab-intro">교재 84쪽 연습문제를 한 흐름으로 묶은 활동입니다. 스마트폰 사진, 유튜브 영상, PDF 논문처럼 디지털 객체를 하나 골라 요소세트를 만드세요. 정답은 하나가 아닙니다. <b>있는 것은 다시 쓰고, 없는 것만 새로 만듭니다.</b></p>
      <div class="stage">
        <h3>할 일 <span class="tally" id="prog"></span></h3>
        <ul class="checks" id="checks"></ul>
        <div class="btn-row">
          <button class="btn btn--ghost btn--sm" type="button" id="ex">막히면: 예시 불러오기</button>
          <button class="btn btn--ghost btn--sm" type="button" id="rs">모두 지우기</button>
          <span class="small muted">입력은 이 브라우저에만 저장됩니다.</span>
        </div>
      </div>
      <div class="stage">
        <h3>❶ 디지털 객체</h3>
        <div class="el-grid">
          <div><label class="lbl" for="ob">무엇을 기술하나요?</label><input type="text" id="ob" data-top="object" value="${esc(set.object)}" placeholder="예: 내가 찍은 교정 사진"></div>
          <div><label class="lbl" for="ab">이 자원의 주소 (없으면 비워 두세요)</label><input type="text" id="ab" data-top="about" value="${esc(set.about)}" placeholder="http://example.org/photo/1" spellcheck="false"></div>
        </div>
      </div>
      <div class="stage">
        <h3>❷❸❺❻ 요소 만들기</h3>
        <p class="small muted" style="margin:0">정의를 비워 두면 표준의 정의를 요약한 문장을 씁니다.</p>
        <div id="els"></div>
        <div class="btn-row"><button class="btn btn--ghost btn--sm" type="button" id="addEl">요소 더하기</button></div>
      </div>
      <div class="stage">
        <h3>❹ 내용규칙과 인코딩스킴은 왜 필요할까요?</h3>
        <label class="lbl" for="why">내 말로 한두 문장</label>
        <input type="text" id="why" data-top="why" value="${esc(set.why)}">
      </div>
      <div class="stage">
        <h3>결과</h3>
        <div class="wrapt" id="tbl"></div>
        <div class="seg" role="group" aria-label="표기 고르기" style="margin-top:.7rem"><button type="button" data-v="xml" aria-pressed="true">XML (xsi:type)</button><button type="button" data-v="rdf" aria-pressed="false">RDF/XML</button></div>
        <pre class="code" id="out" tabindex="0"></pre>
        <p class="say" id="parse" aria-live="polite"></p>
        <div class="btn-row">
          <button class="btn btn--sm" type="button" id="copy">복사</button>
          <button class="btn btn--ghost btn--sm" type="button" id="dl">파일로 받기</button>
          <span class="small" id="copied" aria-live="polite"></span>
        </div>
      </div>`;
    const output = () => (view === 'xml' ? buildXml(set) : buildRdf(set));
    function drawEls() { $('#els').innerHTML = set.els.map(elHtml).join(''); }
    function drawOut() {
      store.set(set);
      const els = set.els.filter(filled);
      $('#tbl').innerHTML = els.length ? `<table class="cmp"><thead><tr><th>네임스페이스:요소명</th><th>레이블</th><th>정의</th><th>주석</th><th>인코딩스킴</th><th>값</th></tr></thead><tbody>${els.map((e) => {
        const r = resolved(e);
        return `<tr><th><code>${esc(r.prefix)}:${esc(r.name)}</code></th><td>${esc(r.label)}</td><td>${esc(r.def)}</td><td>${esc(e.comment)}</td><td>${esc(e.scheme || '—')}</td><td>${esc(e.value)}</td></tr>`;
      }).join('')}</tbody></table>` : '<p class="small muted" style="margin:0">요소를 고르고 값을 적으면 표가 만들어집니다.</p>';
      const text = output();
      $('#out').textContent = text;
      const p = parseXml(text), s = $('#parse');
      if (p.ok) { s.className = 'say ok'; s.textContent = '브라우저의 XML 해석기가 이 코드를 읽었습니다.'; } else { s.className = 'say no'; s.textContent = '읽지 못했습니다: ' + p.msg; }
      drawChecks();
    }
    function drawChecks() {
      const els = set.els.filter(filled);
      const items = [
        ['❶ 디지털 객체를 골랐다', !!set.object.trim()],
        [`❷ 요소를 5개 정의했다 (지금 ${els.length}개)`, els.length >= 5],
        ['❸ 표준을 다시 쓰거나 새 네임스페이스를 붙였다', els.length > 0 && els.every((e) => !warnOf(e).some((w) => w.includes('요소명')))],
        ['❹ 내용규칙과 스킴이 왜 필요한지 적었다', set.why.trim().length >= 10],
        ['❺ 인코딩스킴이 필요한 요소를 표시했다', els.some((e) => e.scheme)],
        ['❻ 값 하나를 IRI로 적었다', els.some((e) => isIri(e.value))],
      ];
      $('#checks').innerHTML = items.map(([t, d]) => `<li class="${d ? 'done' : ''}">${esc(t)}</li>`).join('');
      const n = items.filter((x) => x[1]).length;
      $('#prog').textContent = `${n} / ${items.length}`;
    }
    app.oninput = (e) => {
      const top = e.target.dataset.top;
      if (top) { set[top] = e.target.value; drawOut(); return; }
      const k = e.target.dataset.k;
      if (!k || k === 'term') return;
      const i = +e.target.closest('.el').dataset.i;
      set.els[i][k] = e.target.value;
      $('#w' + i).textContent = warnOf(set.els[i]).join(' ');
      drawOut();
    };
    app.onchange = (e) => {
      if (e.target.dataset.k !== 'term') return;
      const i = +e.target.closest('.el').dataset.i;
      set.els[i].term = e.target.value;
      set.els[i].scheme = '';
      drawEls();
      drawOut();
    };
    app.onclick = (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { set.els.splice(+del.dataset.del, 1); drawEls(); drawOut(); return; }
      const seg = e.target.closest('.seg button');
      if (seg) {
        view = seg.dataset.v;
        $$('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b === seg)));
        drawOut();
        return;
      }
      switch (e.target.id) {
        case 'addEl': set.els.push({ term: '', name: '', label: '', def: '', comment: '', scheme: '', value: '' }); drawEls(); drawOut(); break;
        case 'ex':
          if (!set.els.some((x) => x.term) || confirm('지금 입력한 내용을 예시로 바꿀까요?')) { set = EXAMPLE(); store.set(set); app.oninput = app.onclick = app.onchange = null; lab6(); }
          break;
        case 'rs':
          if (confirm('입력한 내용을 모두 지울까요?')) { store.del(); app.oninput = app.onclick = app.onchange = null; lab6(); }
          break;
        case 'copy': {
          const c = $('#copied');
          (navigator.clipboard ? navigator.clipboard.writeText(output()) : Promise.reject()).then(() => { c.textContent = '복사했습니다.'; }, () => { c.textContent = '복사하지 못했습니다. 코드를 직접 선택해 복사하세요.'; });
          break;
        }
        case 'dl': {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([output()], { type: 'application/xml' }));
          a.download = view === 'xml' ? '내요소세트.xml' : '내요소세트.rdf';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(a.href);
          break;
        }
        default:
      }
    };
    drawEls();
    drawOut();
  }

  route();
})();
