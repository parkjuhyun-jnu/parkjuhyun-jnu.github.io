/* ==========================================================================
   미디어·강연 페이지 — data/media.json 을 읽어 그립니다.
   대표 카드 → 예정 → 연도별 전체 목록(구분 필터·검색) 순서입니다.
   ========================================================================== */
(function () {
  let DATA = null;
  let activeType = 'all';
  let query = '';

  const archiveEl = document.getElementById('archive');
  const filtersEl = document.getElementById('filters');
  const searchEl = document.getElementById('search');
  const countEl = document.getElementById('result-count');
  const today = new Date().toISOString().slice(0, 10);

  fetch('data/media.json')
    .then((r) => r.json())
    .then((data) => {
      DATA = data;
      DATA.items = (data.items || []).filter((x) => x && x.date && x.title);
      // 최신이 위로. 날짜가 같으면 적힌 순서를 지킵니다.
      DATA.items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      document.getElementById('total').textContent = String(DATA.items.length);
      renderStats();
      renderFeatured();
      renderPosters();
      renderUpcoming();
      buildFilters();
      render();
    })
    .catch(() => {
      archiveEl.innerHTML = '<p class="small muted">기록을 불러오지 못했습니다.</p>';
    });

  /* ---------- 도우미 ---------- */
  const typeInfo = (key) => (DATA.types && DATA.types[key]) || { label: key || '기타' };
  const typeTag = (key) => `<span class="tag tag--m-${esc(key)}">${esc(typeInfo(key).label)}</span>`;

  /** 화면에 보일 날짜. dateLabel 이 있으면 그대로(예: 2007–2020), 없으면 2022-08-15 → 2022.08.15 */
  function fmtMediaDate(x) {
    if (x.dateLabel) return String(x.dateLabel);
    return String(x.date || '').split('-').join('.');
  }

  /** 아직 확인하지 못한 내용이 있는 항목에 붙는 작은 꼬리표 */
  function checkTag(x) {
    if (!x.check) return '';
    return `<span class="tag tag--check" title="확인할 것: ${esc(x.check)}">확인 중</span>`;
  }

  /** 유튜브 주소면 영상 ID를 돌려줍니다. */
  function youtubeId(url) {
    if (!url) return '';
    const m = String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  /** 카드에 보여 줄 그림. 직접 넣은 image 가 먼저, 없으면 유튜브 썸네일. */
  function thumbOf(x) {
    if (x.image) return x.image;
    const id = youtubeId(x.url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  }

  /** 매체 · 역할 · 장소 를 한 줄로. 주최를 아직 모르면 '주최 확인 중' 으로 적습니다. */
  function whereOf(x) {
    const outlet = x.outlet || (x.check && x.check.includes('주최') ? '주최 확인 중' : '');
    return [outlet, x.role, x.place].filter(Boolean).join(' · ');
  }

  function titleHtml(x) {
    const t = esc(x.title);
    return x.url
      ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${t}</a>`
      : t;
  }

  function extraLinks(x, opt = {}) {
    const links = [];
    // 포스터·사진 링크는 그림 파일이 실제로 있을 때만 보이게 합니다(revealImageLinks).
    // 대표 카드는 작은 그림을 누르면 포스터가 열리므로 이 링크를 뺍니다(opt.noImage).
    if (x.image && !opt.noImage) links.push(`<a class="media-image-link" href="${esc(x.image)}" target="_blank" rel="noopener" hidden>포스터·사진 보기</a>`);
    (x.links || []).forEach((l) => {
      if (l && l.url) links.push(`<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || '관련 링크')}</a>`);
    });
    // 링크 사이의 가운뎃점은 CSS 가 보이는 링크 사이에만 넣습니다.
    return links.length ? `<span class="media-links">${links.join('')}</span>` : '';
  }

  /** 그림 파일이 아직 없으면 '포스터·사진 보기' 링크를 숨겨 둡니다. */
  function revealImageLinks(root) {
    root.querySelectorAll('a.media-image-link[hidden]').forEach((a) => {
      const img = new Image();
      img.onload = () => { a.hidden = false; };
      img.src = a.getAttribute('href');
    });
  }

  /* ---------- 위쪽 숫자 ---------- */
  function renderStats() {
    const box = document.getElementById('media-stats');
    const groups = [
      ['방송·보도', ['tv', 'news']],
      ['기고·칼럼', ['press']],
      ['강연·토론', ['talk', 'forum']],
    ];
    box.innerHTML = groups.map(([label, keys]) => {
      const n = DATA.items.filter((x) => keys.includes(x.type)).length;
      return `<div class="card card--flat" style="text-align:center">
        <div style="font-size:1.9rem; font-weight:700; color:var(--navy)">${n}</div>
        <div class="small muted">${label}</div>
      </div>`;
    }).join('');
  }

  /* ---------- 대표 카드 ---------- */
  function renderFeatured() {
    const picks = DATA.items.filter((x) => x.featured).slice(0, 6);
    if (!picks.length) return;
    document.getElementById('featured-wrap').style.display = '';
    document.getElementById('featured').innerHTML = picks.map((x) => {
      const thumb = thumbOf(x);
      // 포스터는 작은 미리보기만(아래 '포스터 모음'에 크게 있음). 누르면 원본이 열립니다.
      const href = x.image || x.url || '';
      const media = thumb
        ? `<div class="media-card__thumb">
             ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">` : ''}
             <img src="${esc(thumb)}" alt="" loading="lazy"
                  onerror="this.closest('.media-card').classList.add('media-card--text'); this.closest('.media-card__thumb').remove()">
             ${href ? '</a>' : ''}
           </div>`
        : '';
      const links = extraLinks(x, { noImage: true });
      return `<article class="media-card${thumb ? '' : ' media-card--text'}">
        ${media}
        <div class="media-card__body">
          <div class="row" style="gap:.4rem">${typeTag(x.type)}<span class="small muted">${esc(fmtMediaDate(x))}</span>${checkTag(x)}</div>
          <h3 class="media-card__title" title="${esc(x.title)}">${titleHtml(x)}</h3>
          <p class="small muted media-card__where" title="${esc(whereOf(x))}">${esc(whereOf(x))}</p>
          ${links ? `<p class="small mb-0">${links}</p>` : ''}
        </div>
      </article>`;
    }).join('');
    revealImageLinks(document.getElementById('featured'));
  }

  /* ---------- 포스터 모음 ---------- */
  function renderPosters() {
    const list = DATA.items.filter((x) => x.image);
    if (!list.length) return;
    const box = document.getElementById('posters');
    box.innerHTML = list.map((x) => `
      <li>
        <a href="${esc(x.image)}" target="_blank" rel="noopener">
          <img src="${esc(x.image)}" alt="${esc(x.title)} 포스터" loading="lazy" width="700" height="1000"
               onerror="this.closest('li').remove()">
          <span class="poster-wall__date">${esc(fmtMediaDate(x))}</span>
          <span class="poster-wall__title">${esc(x.title)}</span>
        </a>
      </li>`).join('');
    document.getElementById('poster-count').textContent = String(list.length);
    document.getElementById('posters-wrap').hidden = false;
  }

  /* ---------- 예정 ---------- */
  function renderUpcoming() {
    const soon = DATA.items.filter((x) => String(x.date) > today).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (!soon.length) return;
    document.getElementById('upcoming-wrap').style.display = '';
    document.getElementById('upcoming').innerHTML = soon.map(itemHtml).join('');
    revealImageLinks(document.getElementById('upcoming'));
  }

  /* ---------- 필터 ---------- */
  function buildFilters() {
    const counts = {};
    DATA.items.forEach((x) => { counts[x.type] = (counts[x.type] || 0) + 1; });
    const chips = [['all', '전체', DATA.items.length]]
      .concat(Object.entries(DATA.types || {}).map(([key, t]) => [key, t.label, counts[key] || 0]));

    chips.forEach(([key, label, n]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.type = key;
      b.textContent = `${label} ${n}`;
      b.setAttribute('aria-pressed', String(key === 'all'));
      b.addEventListener('click', () => {
        activeType = key;
        filtersEl.querySelectorAll('.chip').forEach((c) =>
          c.setAttribute('aria-pressed', String(c.dataset.type === key)));
        render();
      });
      filtersEl.appendChild(b);
    });
  }

  searchEl.addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });

  /* ---------- 목록 한 줄 ---------- */
  function itemHtml(x) {
    const where = whereOf(x);
    const links = extraLinks(x);
    return `<li>
      <span class="pub-title">
        ${titleHtml(x)}
        ${where ? `<span class="pub-cite">${esc(where)}</span>` : ''}
        ${x.subtitle ? `<span class="pub-cite">${esc(x.subtitle)}</span>` : ''}
        ${links ? `<span class="pub-cite">${links}</span>` : ''}
      </span>
      <span class="pub-meta">
        <span class="pub-year">${esc(fmtMediaDate(x))}</span>
        ${typeTag(x.type)}
        ${checkTag(x)}
      </span>
    </li>`;
  }

  /* ---------- 연도별 전체 목록 ---------- */
  function render() {
    const rows = DATA.items.filter((x) => {
      const typeOk = activeType === 'all' || x.type === activeType;
      const hay = `${x.title} ${x.outlet || ''} ${x.role || ''} ${x.subtitle || ''}`.toLowerCase();
      const textOk = !query || hay.includes(query);
      return typeOk && textOk;
    });

    countEl.textContent = rows.length === DATA.items.length ? '' : `${rows.length}건이 검색되었습니다.`;

    if (!rows.length) {
      archiveEl.innerHTML = '<p class="small muted">조건에 맞는 기록이 없습니다.</p>';
      return;
    }

    // 연도 소제목 아래 최신순으로 묶습니다.
    const byYear = new Map();
    rows.forEach((x) => {
      const y = String(x.date).slice(0, 4);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(x);
    });

    archiveEl.innerHTML = Array.from(byYear.entries()).map(([y, list]) => `
      <section class="media-year">
        <h3 class="media-year__head">${esc(y)} <span class="small muted" style="font-weight:500">${list.length}건</span></h3>
        <ul class="pub-list">${list.map(itemHtml).join('')}</ul>
      </section>`).join('');
    revealImageLinks(archiveEl);
  }
})();

/* 약력 '복사' 단추 */
(function () {
  const status = document.getElementById('copy-status');
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const el = document.getElementById(btn.dataset.copy);
      if (!el) return;
      try {
        await navigator.clipboard.writeText(el.textContent.trim());
        if (status) status.textContent = '복사했습니다.';
      } catch {
        // 복사가 막힌 환경에서는 글을 선택해 두어 직접 복사할 수 있게 합니다.
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        if (status) status.textContent = '글을 선택해 두었습니다. Ctrl+C로 복사해 주세요.';
      }
    });
  });
})();
