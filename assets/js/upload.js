/* ==========================================================================
   결과물 제출
   과목 고르기 → 수업 코드 확인 → 내용 입력 → 제출
   ========================================================================== */
(function () {
  const CFG = window.SITE_CONFIG;

  const el = {
    form: document.getElementById('form'),
    course: document.getElementById('course'),
    codeField: document.getElementById('code-field'),
    code: document.getElementById('code'),
    codeCheck: document.getElementById('code-check'),
    codeMsg: document.getElementById('code-msg'),
    rest: document.getElementById('rest'),
    fileField: document.getElementById('file-field'),
    linkField: document.getElementById('link-field'),
    file: document.getElementById('file'),
    fileHint: document.getElementById('file-hint'),
    link: document.getElementById('link'),
    title: document.getElementById('title'),
    author: document.getElementById('author'),
    studentno: document.getElementById('studentno'),
    pin: document.getElementById('pin'),
    desc: document.getElementById('desc'),
    msg: document.getElementById('msg'),
    submit: document.getElementById('submit'),
    done: document.getElementById('done'),
  };

  let courses = [];

  if (API.mode === 'demo') document.getElementById('demo-banner').style.display = '';

  el.fileHint.textContent =
    `최대 ${CFG.maxFileMB}MB · ${CFG.allowedExt.join(', ')} · 영상은 '링크로 제출'을 골라 유튜브 주소로 올려 주세요.`;
  el.file.accept = CFG.allowedExt.map((e) => '.' + e).join(',');

  // 삭제 암호 칸에는 숫자만, 네 자리까지만 들어가게 합니다.
  el.pin.addEventListener('input', () => {
    el.pin.value = el.pin.value.replace(/\D/g, '').slice(0, 4);
  });

  init();

  async function init() {
    try {
      courses = await API.listCourses();
    } catch {
      show('danger', '과목 정보를 불러오지 못했습니다.');
      return;
    }

    courses.forEach((c) => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = `${c.title} (${c.term})`;
      el.course.appendChild(o);
    });

    const preset = param('course');
    if (preset && courses.some((c) => c.id === preset)) {
      el.course.value = preset;
    }
    onCourseChange();

    el.course.addEventListener('change', onCourseChange);
    el.codeCheck.addEventListener('click', checkCode);
    el.code.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); checkCode(); }
    });

    document.querySelectorAll('input[name="kind"]').forEach((r) =>
      r.addEventListener('change', onKindChange));

    el.form.addEventListener('submit', onSubmit);
  }

  function onCourseChange() {
    const id = el.course.value;
    el.msg.innerHTML = '';
    if (!id) {
      el.codeField.style.display = 'none';
      el.rest.style.display = 'none';
      return;
    }
    if (API.isUnlocked(id)) {
      el.codeField.style.display = 'none';
      el.rest.style.display = '';
      // 브라우저 기억이 서버와 맞는지 확인하고, 아니면 코드 입력으로 되돌립니다.
      API.verifyUnlock(id).then((ok) => {
        if (!ok && el.course.value === id) {
          askCode('수업 코드를 다시 확인해 주세요. 관리자 로그인·로그아웃 뒤에는 다시 확인이 필요합니다.');
        }
      });
    } else {
      el.codeField.style.display = '';
      el.rest.style.display = 'none';
      el.code.value = '';
      el.codeMsg.textContent = '코드를 확인해야 제출할 수 있습니다.';
      el.codeMsg.style.color = '';
    }
  }

  function askCode(message) {
    el.codeField.style.display = '';
    el.rest.style.display = 'none';
    el.code.value = '';
    el.codeMsg.textContent = message;
    el.codeMsg.style.color = 'var(--danger)';
    el.codeField.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.code.focus();
  }

  async function checkCode() {
    const id = el.course.value;
    if (!id) return;
    el.codeCheck.disabled = true;
    el.codeMsg.textContent = '확인 중…';
    el.codeMsg.style.color = '';
    try {
      const ok = await API.unlock(id, el.code.value);
      if (ok) {
        el.codeMsg.textContent = '확인되었습니다.';
        el.codeMsg.style.color = 'var(--ok)';
        el.codeField.style.display = 'none';
        el.rest.style.display = '';
        el.title.focus();
      } else {
        el.codeMsg.textContent = '코드가 맞지 않습니다.';
        el.codeMsg.style.color = 'var(--danger)';
      }
    } catch (err) {
      el.codeMsg.textContent = err.message || '확인에 실패했습니다.';
      el.codeMsg.style.color = 'var(--danger)';
    } finally {
      el.codeCheck.disabled = false;
    }
  }

  function kind() {
    return document.querySelector('input[name="kind"]:checked').value;
  }

  function onKindChange() {
    const isFile = kind() === 'file';
    el.fileField.style.display = isFile ? '' : 'none';
    el.linkField.style.display = isFile ? 'none' : '';
  }

  function show(type, html) {
    el.msg.innerHTML = `<div class="notice notice--${type}">${html}</div>`;
    el.msg.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function validate() {
    if (!el.title.value.trim()) return '제목을 입력해 주세요.';
    if (!el.author.value.trim()) return '이름을 입력해 주세요.';
    if (!/^\d{4}$/.test(el.pin.value)) {
      return '삭제 암호를 숫자 네 자리로 정해 주세요. 나중에 이 결과물을 지울 때 씁니다.';
    }

    if (kind() === 'file') {
      const f = el.file.files[0];
      if (!f) return '올릴 파일을 골라 주세요.';
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (/^video\//.test(f.type) || ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'webm', 'm4v'].includes(ext)) {
        return '영상은 파일로 올리지 않고 링크로 제출합니다. 유튜브에 \'일부 공개\'로 올린 뒤 위에서 \'링크로 제출\'을 골라 주소를 붙여 넣어 주세요.';
      }
      if (!CFG.allowedExt.includes(ext)) {
        return `올릴 수 없는 형식입니다(.${ext}). 허용: ${CFG.allowedExt.join(', ')}`;
      }
      if (f.size > CFG.maxFileMB * 1024 * 1024) {
        return `파일이 너무 큽니다(${fmtSize(f.size)}). 최대 ${CFG.maxFileMB}MB까지 올릴 수 있습니다. 영상은 유튜브에 올린 뒤 링크로 제출해 주세요.`;
      }
    } else {
      const u = el.link.value.trim();
      if (!u) return '링크 주소를 입력해 주세요.';
      if (!/^https?:\/\/.+/i.test(u)) return '링크는 http:// 또는 https:// 로 시작해야 합니다.';
    }
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) { show('danger', esc(problem)); return; }

    el.submit.disabled = true;
    el.submit.innerHTML = '<span class="spinner"></span> 올리는 중…';
    el.msg.innerHTML = '';

    try {
      const row = await API.createSubmission({
        courseId: el.course.value,
        title: el.title.value,
        author: el.author.value,
        studentNo: el.studentno.value,
        description: el.desc.value,
        password: el.pin.value,
        file: kind() === 'file' ? el.file.files[0] : null,
        linkUrl: kind() === 'link' ? el.link.value : '',
        visibility: document.querySelector('input[name="visibility"]:checked').value,
      });

      const course = courses.find((c) => c.id === el.course.value);
      el.form.style.display = 'none';
      el.done.style.display = '';
      el.done.innerHTML = `
        <div class="card" style="text-align:center; padding:2.4rem 1.6rem">
          <div style="font-size:2.2rem; margin-bottom:.6rem">✅</div>
          <h2 style="font-family:var(--font-serif); font-size:1.35rem">제출되었습니다</h2>
          <p class="muted">${esc(course ? course.title : '')} · ${esc(row.title)}</p>
          <p class="small muted">공개 범위: ${row.visibility === 'public' ? '모두에게 공개' : '수업 안에서만'}</p>
          <p class="small" style="color:var(--ink-soft); margin-top:.9rem">
            지우고 싶을 때는 갤러리에서 <strong>이름과 삭제 암호</strong>를 넣으면 됩니다.
          </p>
          <div class="row" style="justify-content:center; margin-top:1.4rem">
            <a class="btn" href="gallery.html?course=${encodeURIComponent(el.course.value)}">갤러리에서 확인</a>
            <button class="btn btn--ghost" type="button" onclick="location.reload()">하나 더 올리기</button>
          </div>
        </div>`;
      el.done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      el.submit.disabled = false;
      el.submit.textContent = '제출하기';
      if (err && err.needsCode) {
        // 적어 둔 제목·이름 등은 그대로 두고 코드만 다시 받습니다.
        askCode(err.message);
        return;
      }
      show('danger', `<strong>제출하지 못했습니다</strong>${esc(err.message || err)}`);
    }
  }
})();
