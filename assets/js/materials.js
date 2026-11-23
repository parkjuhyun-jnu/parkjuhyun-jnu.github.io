/* ==========================================================================
   자료실 '수강생 전용 자료' — resources.html 아래쪽
   - 제목과 소개는 누구나 봅니다. 파일과 링크는 그 묶음의 코드를 넣은 사람만 엽니다.
   - 권한은 서버(Supabase)가 판단합니다. 이 화면은 보기 좋게 감싼 것뿐입니다.
   - 서버에 자료가 하나도 없거나 데모 모드면 이 구역은 숨은 채로 둡니다.
   ========================================================================== */
(function () {
  const section = document.getElementById('members-section');
  const listEl = document.getElementById('members-list');
  if (!section || !listEl || typeof API === 'undefined') return;

  const fmtSize = (n) => {
    if (!n && n !== 0) return '';
    if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))}KB`;
    return `${(n / 1024 / 1024).toFixed(1)}MB`;
  };
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  };

  load();

  async function load() {
    let rows;
    try {
      rows = await API.listMaterials();
    } catch {
      return;   // 목록을 못 받아도 공개 자료는 그대로 보이므로 조용히 둡니다
    }
    if (!rows.length) { section.hidden = true; return; }

    // 묶음(과목, 연수)별로 모읍니다.
    const groups = [];
    const byId = {};
    rows.forEach((r) => {
      if (!byId[r.course_id]) {
        byId[r.course_id] = { id: r.course_id, title: r.course_title, term: r.course_term, unlocked: r.unlocked, items: [] };
        groups.push(byId[r.course_id]);
      }
      byId[r.course_id].items.push(r);
    });

    listEl.innerHTML = groups.map(groupCard).join('');
    section.hidden = false;
    bind();
  }

  function groupCard(g) {
    const items = g.items.map((r) => `
      <li style="padding:.75rem 0; border-top:1px solid var(--line)">
        <div style="display:flex; gap:.8rem; align-items:flex-start; justify-content:space-between; flex-wrap:wrap">
          <div style="flex:1 1 220px; min-width:0">
            <strong style="display:block; line-height:1.45">${esc(r.title)}</strong>
            ${r.summary ? `<span class="small" style="display:block; color:var(--ink-soft); margin-top:.2rem">${esc(r.summary)}</span>` : ''}
            <span class="small muted" style="display:block; margin-top:.2rem">
              ${r.kind === 'file' ? esc([r.file_name, fmtSize(r.file_size)].filter(Boolean).join(' · ')) : '바깥 링크'}
              ${fmtDate(r.created_at) ? ' · ' + esc(fmtDate(r.created_at)) : ''}
            </span>
          </div>
          ${g.unlocked
            ? `<button class="btn btn--sm mat-open" type="button" data-id="${esc(r.id)}" data-course="${esc(g.id)}" data-kind="${esc(r.kind)}" style="flex:none">${r.kind === 'file' ? '내려받기' : '링크 열기'}</button>`
            : `<span class="small muted" style="flex:none" aria-label="잠김">🔒 잠김</span>`}
        </div>
      </li>`).join('');

    const codeForm = g.unlocked ? '' : `
      <form class="mat-code" data-course="${esc(g.id)}" style="margin-top:.9rem">
        <div style="display:flex; gap:.5rem">
          <label class="sr-only" for="code-${esc(g.id)}">${esc(g.title)} 코드</label>
          <input type="text" id="code-${esc(g.id)}" autocomplete="off" placeholder="안내받은 코드" required style="flex:1; min-width:0">
          <button class="btn btn--sm" type="submit" style="flex:none">열기</button>
        </div>
        <p class="small mat-msg" style="margin:.5rem 0 0; min-height:1.2em"></p>
      </form>`;

    return `
    <article class="card course-card">
      <span class="course-card__term">${g.unlocked ? '열림' : '🔒 코드 필요'}${g.term ? ' · ' + esc(g.term) : ''}</span>
      <h3 class="course-card__title">${esc(g.title)}</h3>
      <ul style="list-style:none; margin:.3rem 0 0; padding:0">${items}</ul>
      ${codeForm}
    </article>`;
  }

  function bind() {
    listEl.querySelectorAll('.mat-code').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const msg = form.querySelector('.mat-msg');
        btn.disabled = true;
        msg.textContent = '확인 중…';
        msg.style.color = '';
        try {
          const ok = await API.unlock(form.dataset.course, form.querySelector('input').value);
          if (ok) { await load(); return; }
          msg.textContent = '코드가 맞지 않습니다. 다시 확인해 주세요.';
          msg.style.color = 'var(--danger)';
        } catch (err) {
          msg.textContent = err.message || '확인 중 문제가 생겼습니다.';
          msg.style.color = 'var(--danger)';
        } finally {
          btn.disabled = false;
        }
      });
    });

    listEl.querySelectorAll('.mat-open').forEach((btn) => {
      btn.addEventListener('click', async () => {
        // 파일은 내려받기로 받으므로 이 창에서 엽니다(페이지는 그대로 남습니다).
        // 링크는 새 창으로 엽니다. 팝업 차단을 피하려고 창을 먼저 열어 두고 주소를 나중에 넣습니다.
        const win = btn.dataset.kind === 'link' ? window.open('', '_blank') : null;
        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = '여는 중…';
        try {
          const url = await API.openMaterial(btn.dataset.id, btn.dataset.course);
          if (win) { win.opener = null; win.location.href = url; } else { location.href = url; }
        } catch (err) {
          if (win) win.close();
          if (err.needsCode) { await load(); return; }
          alert('열지 못했습니다: ' + (err.message || err));
        } finally {
          btn.disabled = false;
          btn.textContent = label;
        }
      });
    });
  }
})();
