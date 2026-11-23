/* ==========================================================================
   관리 페이지 — 자료실 '수강생 전용 자료' 올리기와 묶음(코드) 관리
   권한 확인은 서버(Supabase)가 합니다(supabase/4-class-materials.sql).
   ========================================================================== */
const MaterialsAdmin = (() => {
  const $ = (id) => document.getElementById(id);
  let groups = [];
  let courseIds = [];   // 수업 과목(data/courses.json) id — 이 묶음의 코드는 갤러리 제출 코드와 같습니다
  let started = false;

  const say = (el, text, ok) => {
    el.textContent = text;
    el.style.color = ok === true ? 'var(--ok)' : ok === false ? 'var(--danger)' : '';
  };
  const fmtSize = (n) => (n == null ? '' : n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`);
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  };
  const groupTitle = (id) => (groups.find((g) => g.id === id) || {}).title || id;

  async function init() {
    if (started || !$('mat-card')) return;
    started = true;

    $('mat-file-hint').textContent =
      `최대 ${SITE_CONFIG.materialsMaxMB}MB. 더 큰 파일은 구글 드라이브에 두고 아래 링크 칸에 넣으세요.`;

    if (API.mode === 'demo') {
      $('mat-setup').innerHTML = `<div class="notice notice--info" style="margin-bottom:1rem">
        데모 모드에서는 쓸 수 없습니다. Supabase 를 붙이면 쓸 수 있습니다.</div>`;
      $('mat-form').querySelectorAll('input, select, textarea, button').forEach((x) => { x.disabled = true; });
      return;
    }

    courseIds = (await API.listCourses().catch(() => [])).map((c) => c.id);
    $('mat-form').addEventListener('submit', onUpload);
    $('grp-form').addEventListener('submit', onCreateGroup);
    await refresh();
  }

  async function refresh() {
    try {
      groups = await API.listMaterialGroups();
    } catch (err) {
      $('mat-setup').innerHTML = `<div class="notice notice--danger" style="margin-bottom:1rem">
        묶음 목록을 불러오지 못했습니다: ${esc(err.message || err)}</div>`;
      return;
    }
    const sel = $('mat-group');
    const keep = sel.value;
    sel.innerHTML = groups.map((g) =>
      `<option value="${esc(g.id)}">${esc(g.title)}${g.term ? ' (' + esc(g.term) + ')' : ''}${g.is_open ? '' : ' · 닫힘'}</option>`).join('');
    if (keep && groups.some((g) => g.id === keep)) sel.value = keep;
    paintGroups();

    let rows;
    try {
      rows = await API.listMaterialsAdmin();
    } catch (err) {
      if (err.notSetUp) {
        $('mat-setup').innerHTML = `<div class="notice notice--danger" style="margin-bottom:1rem">
          <strong>서버 설정이 아직 안 되었습니다.</strong>
          Supabase 대시보드 → SQL Editor 에 저장소의 <code>supabase/4-class-materials.sql</code> 을 붙여 넣고 Run 을 누른 뒤 이 페이지를 새로 고치세요.</div>`;
        $('mat-form').querySelectorAll('input, select, textarea, button').forEach((x) => { x.disabled = true; });
      } else {
        $('mat-list').innerHTML = `<p class="small" style="color:var(--danger)">목록을 불러오지 못했습니다: ${esc(err.message || err)}</p>`;
      }
      return;
    }
    $('mat-setup').innerHTML = '';
    paintList(rows);
  }

  function paintList(rows) {
    if (!rows.length) {
      $('mat-list').innerHTML = '<p class="small muted">아직 올린 전용 자료가 없습니다.</p>';
      return;
    }
    $('mat-list').innerHTML = `
      <p class="small" style="font-weight:600; margin:0 0 .3rem">올린 자료 ${rows.length}건</p>
      <ul style="list-style:none; margin:0; padding:0">
        ${rows.map((r) => `
        <li style="display:flex; gap:.8rem; align-items:flex-start; justify-content:space-between; padding:.6rem 0; border-top:1px solid var(--line)">
          <div style="min-width:0">
            <strong style="font-size:.92rem">${esc(r.title)}</strong>
            <span class="small muted" style="display:block">
              ${esc(groupTitle(r.course_id))} ·
              ${r.file_path ? esc([r.file_name, fmtSize(r.file_size)].filter(Boolean).join(' ')) : '링크: ' + esc(r.link_url)}
              · ${esc(fmtDate(r.created_at))}</span>
          </div>
          <button class="btn btn--ghost btn--sm mat-del" type="button" data-id="${esc(r.id)}" style="flex:none">지우기</button>
        </li>`).join('')}
      </ul>`;

    $('mat-list').querySelectorAll('.mat-del').forEach((b) => {
      b.addEventListener('click', async () => {
        const row = rows.find((r) => r.id === b.dataset.id);
        if (!row) return;
        if (!confirm(`"${row.title}" 을(를) 지울까요?\n올린 파일까지 함께 사라지며 되돌릴 수 없습니다.`)) return;
        b.disabled = true;
        try {
          await API.removeMaterial(row);
          await refresh();
        } catch (err) {
          alert('지우지 못했습니다: ' + (err.message || err));
          b.disabled = false;
        }
      });
    });
  }

  async function onUpload(e) {
    e.preventDefault();
    const msg = $('mat-msg');
    const file = $('mat-file').files[0] || null;
    const link = $('mat-link').value.trim();
    if (!$('mat-group').value) { say(msg, '묶음을 먼저 만들어 주세요.', false); return; }
    if (!file && !link) { say(msg, '파일을 고르거나 링크를 넣어 주세요.', false); return; }
    if (!file && !/^https?:\/\//i.test(link)) { say(msg, '링크는 http:// 나 https:// 로 시작해야 합니다.', false); return; }
    if (file && file.size > SITE_CONFIG.materialsMaxMB * 1024 * 1024) {
      say(msg, `파일이 너무 큽니다. 최대 ${SITE_CONFIG.materialsMaxMB}MB입니다. 큰 파일은 링크로 올려 주세요.`, false);
      return;
    }

    const btn = $('mat-form').querySelector('button[type="submit"]');
    btn.disabled = true;
    say(msg, file ? '올리는 중… (파일이 크면 시간이 걸립니다)' : '저장하는 중…');
    try {
      await API.createMaterial({
        courseId: $('mat-group').value,
        title: $('mat-title').value,
        summary: $('mat-summary').value,
        file,
        linkUrl: link,
      });
      const keep = $('mat-group').value;
      $('mat-form').reset();
      $('mat-group').value = keep;
      say(msg, '올렸습니다. 자료실 페이지를 새로 고치면 보입니다.', true);
      await refresh();
    } catch (err) {
      say(msg, '올리지 못했습니다: ' + (err.message || err), false);
    } finally {
      btn.disabled = false;
    }
  }

  function paintGroups() {
    const box = $('grp-list');
    if (!groups.length) {
      box.innerHTML = '<p class="small muted">묶음이 없습니다. 아래에서 만드세요.</p>';
      return;
    }
    box.innerHTML = groups.map((g) => `
      <form class="grp-row" data-id="${esc(g.id)}" style="display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; padding:.55rem 0; border-top:1px solid var(--line)">
        <div style="flex:1 1 220px; min-width:0">
          <strong style="font-size:.92rem">${esc(g.title)}</strong>
          <span class="small muted" style="display:block">${esc(g.id)}${g.term ? ' · ' + esc(g.term) : ''} · ${g.is_open ? '열림' : '닫힘'}</span>
        </div>
        <label class="sr-only" for="code-${esc(g.id)}">${esc(g.title)} 새 코드</label>
        <input type="text" id="code-${esc(g.id)}" placeholder="새 코드" minlength="4" autocomplete="off" style="flex:0 1 150px">
        <button class="btn btn--sm" type="submit" style="flex:none">코드 바꾸기</button>
        <button class="btn btn--ghost btn--sm grp-open" type="button" style="flex:none">${g.is_open ? '닫기' : '다시 열기'}</button>
        <p class="small grp-msg" style="flex-basis:100%; margin:0; min-height:0"></p>
      </form>`).join('');

    box.querySelectorAll('.grp-row').forEach((form) => {
      const id = form.dataset.id;
      const g = groups.find((x) => x.id === id);
      const msg = form.querySelector('.grp-msg');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        const code = input.value.trim();
        if (code.length < 4) { say(msg, '코드는 4자 이상으로 정해 주세요.', false); return; }
        const isCourse = courseIds.includes(id);
        if (!confirm(`"${g.title}" 코드를 바꿀까요?` +
          (isCourse ? '\n수업 과목이라 결과물 갤러리 제출 코드도 함께 바뀝니다.' : '') +
          '\n이미 코드를 넣은 사람은 그대로 열 수 있습니다.')) return;
        try {
          await API.setGroupCode(id, code);
          input.value = '';
          say(msg, '바꿨습니다. 새 코드를 따로 적어 두세요(다시 볼 수 없습니다).', true);
        } catch (err) {
          say(msg, '바꾸지 못했습니다: ' + (err.message || err), false);
        }
      });

      form.querySelector('.grp-open').addEventListener('click', async () => {
        const next = !g.is_open;
        if (!next && !confirm(`"${g.title}" 묶음을 닫을까요?\n새로 코드를 넣을 수 없게 되고, 수업 과목이면 결과물 제출도 막힙니다.`)) return;
        try {
          await API.setGroupOpen(id, next);
          await refresh();
        } catch (err) {
          say(msg, '바꾸지 못했습니다: ' + (err.message || err), false);
        }
      });
    });
  }

  async function onCreateGroup(e) {
    e.preventDefault();
    const msg = $('grp-msg');
    const id = $('grp-id').value.trim().toLowerCase();
    const title = $('grp-title').value.trim();
    const term = $('grp-term').value.trim();
    const code = $('grp-code').value.trim();
    if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(id)) { say(msg, 'id 는 영문 소문자, 숫자, 하이픈으로 3자 이상 적어 주세요.', false); return; }
    if (code.length < 4) { say(msg, '코드는 4자 이상으로 정해 주세요.', false); return; }
    const btn = $('grp-form').querySelector('button');
    btn.disabled = true;
    say(msg, '만드는 중…');
    try {
      await API.createMaterialGroup({ id, title, term, code });
      $('grp-form').reset();
      say(msg, `만들었습니다. 코드를 따로 적어 두세요(다시 볼 수 없습니다).`, true);
      await refresh();
      $('mat-group').value = id;
    } catch (err) {
      say(msg, '만들지 못했습니다: ' + (err.message || err), false);
    } finally {
      btn.disabled = false;
    }
  }

  return { init };
})();
