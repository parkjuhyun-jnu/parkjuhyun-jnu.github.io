/* AI독서리터러시 수업 자료 공통 부품.
   서버·가입 없음. 학생이 적은 내용은 이 브라우저의 localStorage에만 남고 밖으로 나가지 않는다.
   - 내 책 카드: #bookcard 안에 양식을 그리고 air:book 에 저장한다.
   - 책 상태 줄: #bookbar 에 지금 책 제목을 보여 준다.
   - 프롬프트 조립기: .pb 안의 .tpl(본문, {{title}} 같은 자리표)을 책 카드로 채워 textarea·복사·열기 단추를 만든다.
   - 점검표: ul.checks[data-key] 의 항목을 누르면 표시가 남는다.
   - 확인 문제: .q 안의 button[data-ok] / button[data-no="설명"] 을 채점한다.
   - 제작 기록: .log[data-key] 에 양식을 그리고 복사·내려받기를 돕는다. */
(() => {
  const KEY = 'air:book';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* 지우지 못해도 된다 */ } },
  };

  /* ---------- 내 책 카드 ---------- */
  const FIELDS = [
    { k: 'title', label: '책 제목', ph: '예: 어린 왕자', req: true },
    { k: 'author', label: '저자', ph: '예: 앙투안 드 생텍쥐페리' },
    { k: 'genre', label: '갈래', ph: '예: 소설, 그림책, 과학 교양, 에세이' },
    { k: 'reader', label: '콘텐츠의 대상 독자', ph: '예: 초등 5~6학년, 대학 신입생, 직장인' },
    { k: 'chars', label: '주요 인물(또는 핵심 개념)', ph: '예: 어린 왕자, 조종사, 여우, 장미', wide: true },
    { k: 'scene', label: '핵심 장면 2~3개', ph: '예: 여우가 길들이기의 뜻을 설명하는 장면 / 어린 왕자가 장미를 떠나는 장면', wide: true, multi: true },
    { k: 'theme', label: '주제·메시지', ph: '예: 관계는 시간을 들여 길들이는 것', wide: true },
    { k: 'line', label: '한 줄 소개(내 말로)', ph: '예: 어른이 잊어버린 것을 아이의 눈으로 되묻는 이야기', wide: true },
    { k: 'quote', label: '인용할 문장(짧게, 쪽수와 함께)', ph: '예: “가장 중요한 것은 눈에 보이지 않아.” (98쪽)', wide: true, multi: true },
  ];
  const PH = { title: '[책 제목]', author: '[저자]', genre: '[갈래]', reader: '[대상 독자]', chars: '[주요 인물]', scene: '[핵심 장면]', theme: '[주제]', line: '[한 줄 소개]', quote: '[인용 문장]' };
  const getBook = () => store.get(KEY, {});
  const hasBook = (b) => !!(b && b.title && String(b.title).trim());
  const fill = (tpl, b) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (b[k] && String(b[k]).trim()) || PH[k] || m);
  const CARD_URL = 'materials/ai-reading-2026-2/basics/#card';

  function renderBookCard(root) {
    const b = getBook();
    root.innerHTML = '';
    const card = h(`<div class="bookcard"><div class="grid">${FIELDS.map((f) => `
      <div class="f${f.wide ? ' wide' : ''}"><label for="bk-${f.k}">${esc(f.label)}${f.req ? ' <i>*</i>' : ''}</label>
      ${f.multi ? `<textarea id="bk-${f.k}" placeholder="${esc(f.ph)}">${esc(b[f.k] || '')}</textarea>` : `<input id="bk-${f.k}" type="text" placeholder="${esc(f.ph)}" value="${esc(b[f.k] || '')}">`}</div>`).join('')}</div>
      <div class="btn-row"><button type="button" class="btn btn--sm" data-act="save">저장</button><button type="button" class="btn btn--ghost btn--sm" data-act="clear">지우기</button><span class="state" aria-live="polite">${hasBook(b) ? '저장된 책: ' + esc(b.title) : '아직 저장한 책이 없습니다.'}</span></div>
      <p class="small muted" style="margin:.6rem 0 0">이 카드는 내 브라우저에만 저장됩니다. 다른 기기나 브라우저에서는 다시 적어야 합니다.</p></div>`);
    root.appendChild(card);
    const state = card.querySelector('.state');
    card.querySelector('[data-act="save"]').addEventListener('click', () => {
      const o = {};
      FIELDS.forEach((f) => { o[f.k] = card.querySelector('#bk-' + f.k).value.trim(); });
      if (!o.title) { state.className = 'state'; state.textContent = '책 제목은 꼭 적어 주세요.'; card.querySelector('#bk-title').focus(); return; }
      const ok = store.set(KEY, o);
      state.className = 'state' + (ok ? ' ok' : '');
      state.textContent = ok ? `저장했습니다: ${o.title}. 모든 단원의 프롬프트가 이 책에 맞춰집니다.` : '브라우저가 저장을 막고 있습니다. 프롬프트는 복사해서 쓰면 됩니다.';
      document.dispatchEvent(new CustomEvent('air:book'));
    });
    card.querySelector('[data-act="clear"]').addEventListener('click', () => {
      if (!confirm('내 책 카드를 지울까요?')) return;
      store.del(KEY);
      FIELDS.forEach((f) => { card.querySelector('#bk-' + f.k).value = ''; });
      state.className = 'state'; state.textContent = '지웠습니다.';
      document.dispatchEvent(new CustomEvent('air:book'));
    });
  }

  function renderBookBar(el) {
    const draw = () => {
      const b = getBook();
      if (hasBook(b)) {
        el.className = 'bookbar';
        el.innerHTML = `<span>지금 책: <b>${esc(b.title)}</b>${b.author ? ' · ' + esc(b.author) : ''}${b.reader ? ' · 대상 ' + esc(b.reader) : ''}</span><a href="${CARD_URL}">카드 고치기</a>`;
      } else {
        el.className = 'bookbar empty';
        el.innerHTML = `<span>아직 <b>내 책 카드</b>가 없습니다. 카드를 적어 두면 아래 프롬프트가 내 책에 맞춰집니다.</span><a href="${CARD_URL}">카드 적으러 가기</a>`;
      }
    };
    draw();
    document.addEventListener('air:book', draw);
  }

  /* ---------- 프롬프트 조립기 ---------- */
  const OPEN = [
    { label: 'ChatGPT로 열기', url: (p) => 'https://chatgpt.com/?q=' + encodeURIComponent(p), max: 6000 },
    { label: '클로드로 열기', url: (p) => 'https://claude.ai/new?q=' + encodeURIComponent(p), max: 6000 },
    { label: '제미나이 열기', url: () => 'https://gemini.google.com/app', max: Infinity, plain: true },
  ];
  function renderPrompt(pb, n) {
    const tplEl = pb.querySelector('.tpl');
    if (!tplEl) return;
    const tpl = tplEl.textContent.replace(/^\n+|\s+$/g, '');
    const ta = h(`<textarea aria-label="프롬프트 ${n}" spellcheck="false"></textarea>`);
    const row = h('<div class="btn-row"></div>');
    const copy = h('<button type="button" class="btn btn--sm">복사</button>');
    const reset = h('<button type="button" class="btn btn--ghost btn--sm">내 책으로 다시 채우기</button>');
    const state = h('<span class="state" aria-live="polite"></span>');
    const links = OPEN.map((o) => h(`<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener">${o.label}</a>`));
    let dirty = false;
    const refill = () => { ta.value = fill(tpl, getBook()); dirty = false; relink(); };
    const relink = () => {
      const p = ta.value;
      links.forEach((a, i) => { const o = OPEN[i]; a.href = (o.plain || p.length > o.max) ? o.url('') : o.url(p); if (!o.plain) a.title = p.length > o.max ? '프롬프트가 길어 미리 채우지 못합니다. 복사해서 붙여 넣으세요.' : '새 창에 프롬프트가 채워져 열립니다. 한 번 더 확인하고 보내세요.'; });
    };
    ta.addEventListener('input', () => { dirty = true; relink(); });
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(ta.value); state.className = 'state ok'; state.textContent = '복사했습니다. AI 대화창에 붙여 넣으세요.'; }
      catch { ta.select(); state.className = 'state'; state.textContent = '자동 복사가 막혀 있습니다. 글을 선택했으니 Ctrl+C를 누르세요.'; }
    });
    reset.addEventListener('click', refill);
    row.append(copy, ...links, reset, state);
    const hint = h(`<p class="hint">자리표 [책 제목] 같은 괄호가 남아 있으면 <a href="${CARD_URL}">내 책 카드</a>를 먼저 적거나 직접 고쳐 쓰세요. 보내기 전에 내 말로 한 번 다듬는 것이 좋습니다.</p>`);
    tplEl.after(ta, row, hint);
    refill();
    document.addEventListener('air:book', () => { if (!dirty) refill(); });
  }

  /* ---------- 점검표 ---------- */
  function renderChecks(ul) {
    const key = 'air:check:' + (ul.dataset.key || location.pathname);
    const items = [...ul.querySelectorAll('li')];
    const saved = store.get(key, []);
    const state = h('<p class="checks-state" aria-live="polite"></p>');
    ul.after(state);
    const paint = () => {
      const done = items.filter((li) => li.classList.contains('done')).length;
      state.textContent = done === items.length ? `점검 끝. ${items.length}개 모두 확인했습니다.` : `확인한 것 ${done} / ${items.length}. 항목을 누르면 표시가 남습니다.`;
    };
    items.forEach((li, i) => {
      li.tabIndex = 0; li.setAttribute('role', 'checkbox');
      if (saved[i]) li.classList.add('done');
      li.setAttribute('aria-checked', li.classList.contains('done'));
      const toggle = () => { li.classList.toggle('done'); li.setAttribute('aria-checked', li.classList.contains('done')); store.set(key, items.map((x) => x.classList.contains('done'))); paint(); };
      li.addEventListener('click', toggle);
      li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
    });
    paint();
  }

  /* ---------- 확인 문제 ---------- */
  function initQuiz(q) {
    const say = q.querySelector('.say');
    const btns = [...q.querySelectorAll('.opts button')];
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('right', 'wrong'));
      if (b.hasAttribute('data-ok')) { b.classList.add('right'); say.textContent = '맞습니다. ' + (q.dataset.why || ''); }
      else { b.classList.add('wrong'); say.textContent = '다시 생각해 보세요. ' + (b.dataset.no || ''); }
    }));
  }

  /* ---------- 제작 기록 ---------- */
  const LOG_FIELDS = [
    { k: 'kind', label: '콘텐츠 종류', ph: '예: 북트레일러(영상), 독서 퀴즈(게임)' },
    { k: 'book', label: '책', ph: '제목 · 저자 · 출판사 · 연도' },
    { k: 'reader', label: '대상 독자와 목적', ph: '누가, 무엇을 위해 보는가' },
    { k: 'tools', label: '쓴 AI 도구', ph: '예: ChatGPT(대본), 나노 바나나(이미지), CapCut(편집)' },
    { k: 'prompts', label: '주요 프롬프트(요약)', ph: '어떤 역할·맥락·조건을 주었는지 2~3개', wide: true, multi: true },
    { k: 'human', label: '내가 바꾼 것(사람의 기여)', ph: '고른 것, 고친 것, 버린 것, 순서를 바꾼 것', wide: true, multi: true },
    { k: 'verify', label: '책과 대조해 고친 오류', ph: 'AI가 틀리게 말한 인물·장면·인용과 고친 내용', wide: true, multi: true },
    { k: 'rights', label: '저작권·표시', ph: '인용 범위, 이미지 출처, AI 사용 표시 문구', wide: true, multi: true },
    { k: 'next', label: '남은 문제·다음에 할 것', ph: '', wide: true },
  ];
  function renderLog(root) {
    const key = 'air:log:' + (root.dataset.key || 'default');
    const v = store.get(key, {});
    root.innerHTML = `<div class="grid">${LOG_FIELDS.map((f) => `
      <div class="f${f.wide ? ' wide' : ''}"><label for="lg-${f.k}">${esc(f.label)}</label>
      ${f.multi ? `<textarea id="lg-${f.k}" placeholder="${esc(f.ph)}">${esc(v[f.k] || '')}</textarea>` : `<input id="lg-${f.k}" type="text" placeholder="${esc(f.ph)}" value="${esc(v[f.k] || '')}">`}</div>`).join('')}</div>
      <div class="btn-row"><button type="button" class="btn btn--sm" data-act="save">저장</button><button type="button" class="btn btn--ghost btn--sm" data-act="copy">글로 복사</button><button type="button" class="btn btn--ghost btn--sm" data-act="down">.txt 내려받기</button><span class="state" aria-live="polite"></span></div>
      <p class="small muted" style="margin:.6rem 0 0">저장은 내 브라우저에만 됩니다. 제출할 때는 복사하거나 내려받아 결과물과 함께 올리세요.</p>`;
    const state = root.querySelector('.state');
    const read = () => { const o = {}; LOG_FIELDS.forEach((f) => { o[f.k] = root.querySelector('#lg-' + f.k).value.trim(); }); return o; };
    const text = (o) => ['# 제작 기록 (AI독서리터러시)', '작성일: ' + new Date().toISOString().slice(0, 10), ''].concat(LOG_FIELDS.map((f) => `## ${f.label}\n${o[f.k] || '(없음)'}\n`)).join('\n');
    root.querySelector('[data-act="save"]').addEventListener('click', () => { const ok = store.set(key, read()); state.className = 'state' + (ok ? ' ok' : ''); state.textContent = ok ? '저장했습니다.' : '브라우저가 저장을 막고 있습니다. 복사해 두세요.'; });
    root.querySelector('[data-act="copy"]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(text(read())); state.className = 'state ok'; state.textContent = '복사했습니다.'; } catch { state.className = 'state'; state.textContent = '자동 복사가 막혀 있습니다. 내려받기를 쓰세요.'; } });
    root.querySelector('[data-act="down"]').addEventListener('click', () => {
      const o = read(); store.set(key, o);
      const blob = new Blob([text(o)], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '제작기록-' + (o.kind || '콘텐츠').replace(/[\\/:*?"<>|\s]+/g, '_') + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      state.className = 'state ok'; state.textContent = '내려받았습니다.';
    });
  }

  /* ---------- 시작 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const bc = document.getElementById('bookcard'); if (bc) renderBookCard(bc);
    const bb = document.getElementById('bookbar'); if (bb) renderBookBar(bb);
    document.querySelectorAll('.pb').forEach((pb, i) => renderPrompt(pb, i + 1));
    document.querySelectorAll('ul.checks').forEach(renderChecks);
    document.querySelectorAll('.q').forEach(initQuiz);
    document.querySelectorAll('.log').forEach(renderLog);
  });

  window.AIR = { getBook, hasBook, fill, FIELDS };
})();
