/* ==========================================================================
   데이터 계층 — 갤러리·업로드·관리 페이지가 공통으로 씁니다.

   두 가지 모드로 돌아갑니다.
     supabase 모드 : config.js 에 url/anonKey 가 채워져 있을 때. 진짜 저장.
     demo 모드     : 비어 있을 때. 내 브라우저에만 저장(연결 전 화면 확인용).
   화면 쪽 코드는 어느 모드인지 신경 쓰지 않아도 되도록 감싸 두었습니다.
   ========================================================================== */

const API = (() => {
  const CFG = window.SITE_CONFIG;
  const MODE = window.isSupabaseConfigured() ? 'supabase' : 'demo';

  let bareReady = null;       // 라이브러리와 client 만 준비하는 Promise
  let clientReady = null;     // 익명 로그인까지 마친 client 를 주는 Promise

  /* ---------- Supabase 준비 ---------- */

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Supabase 라이브러리를 불러오지 못했습니다.'));
      document.head.appendChild(s);
    });
  }

  /**
   * 익명 로그인 없이 client 만 만듭니다. 전에 로그인한 기록이 브라우저에 있으면 그대로 씁니다.
   * 자료실처럼 방문자가 많은 페이지에서 목록만 볼 때 쓰면, 들르는 사람마다 익명 계정이 생기지 않습니다.
   */
  async function getBareClient() {
    if (MODE !== 'supabase') return null;
    if (!bareReady) {
      bareReady = (async () => {
        if (!window.supabase?.createClient) {
          await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js');
        }
        return window.supabase.createClient(CFG.supabase.url, CFG.supabase.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true },
        });
      })();
      bareReady.catch(() => { bareReady = null; });   // 실패하면 다음에 다시 시도
    }
    return bareReady;
  }

  async function getClient() {
    if (MODE !== 'supabase') return null;
    if (!clientReady) {
      clientReady = (async () => {
        const client = await getBareClient();
        // 수업 코드 해제 기록을 브라우저별로 묶기 위해 익명 로그인을 해 둡니다.
        const { data } = await client.auth.getSession();
        if (!data.session) await client.auth.signInAnonymously();
        return client;
      })();
    }
    return clientReady;
  }

  /* ---------- 데모 저장소 ---------- */

  const DEMO_KEY = 'demo:submissions';
  const UNLOCK_KEY = 'unlocked:courses';

  function demoAll() {
    try { return JSON.parse(store.get(DEMO_KEY) || '[]'); } catch { return []; }
  }
  function demoSave(rows) {
    try { store.set(DEMO_KEY, JSON.stringify(rows)); return true; }
    catch { return false; }
  }

  function unlockedList() {
    try { return JSON.parse(store.get(UNLOCK_KEY) || '[]'); } catch { return []; }
  }
  function rememberUnlock(courseId) {
    const list = unlockedList();
    if (!list.includes(courseId)) { list.push(courseId); store.set(UNLOCK_KEY, JSON.stringify(list)); }
  }

  /* ---------- 과목 정보 (두 모드 공통, 파일에서 읽음) ---------- */

  let coursesCache = null;
  async function listCourses() {
    if (coursesCache) return coursesCache;
    const res = await fetch('data/courses.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('과목 정보를 불러오지 못했습니다.');
    const json = await res.json();
    coursesCache = json.courses || [];
    return coursesCache;
  }

  async function getCourse(id) {
    const all = await listCourses();
    return all.find((c) => c.id === id) || null;
  }

  /* ---------- 수업 코드 ---------- */

  function isUnlocked(courseId) {
    return unlockedList().includes(courseId);
  }

  async function unlock(courseId, code) {
    const clean = String(code || '').trim();
    if (!clean) return false;

    if (MODE === 'demo') {
      const course = await getCourse(courseId);
      const ok = course && clean.toLowerCase() === String(course.demoCode || '').toLowerCase();
      if (ok) rememberUnlock(courseId);
      return ok;
    }

    const supa = await getClient();
    const { data, error } = await supa.rpc('unlock_course', {
      p_course_id: courseId,
      p_code: clean,
    });
    if (error) throw error;
    if (data === true) rememberUnlock(courseId);
    return data === true;
  }

  /**
   * 이 브라우저가 '코드를 풀었다'고 기억하는 과목을 서버에도 확인합니다.
   * 관리자 로그인·로그아웃을 하면 접속 계정이 바뀌어 서버 쪽 해제 기록이 없어지는데,
   * 그때 브라우저 기억만 믿고 제출하면 'row-level security' 오류가 납니다.
   * 서버에 기록이 없으면 브라우저 기억도 지우고 false 를 돌려줍니다.
   */
  async function verifyUnlock(courseId) {
    if (!isUnlocked(courseId)) return false;
    if (MODE === 'demo') return true;
    try {
      const supa = await getClient();
      const { data, error } = await supa.rpc('has_access', { p_course_id: courseId });
      if (error) return true;            // 확인 자체가 안 되면 막지 않고 제출 단계에서 다시 판단
      if (data === true) return true;
    } catch { return true; }
    lock(courseId);
    return false;
  }

  function lock(courseId) {
    const list = unlockedList().filter((id) => id !== courseId);
    store.set(UNLOCK_KEY, JSON.stringify(list));
  }

  /* ---------- 결과물 목록 ---------- */

  /**
   * 한 과목의 결과물을 가져옵니다.
   * 권한은 서버(Supabase)가 판단합니다. 코드를 풀지 않았으면 공개 항목만 돌아옵니다.
   */
  async function listSubmissions(courseId) {
    if (MODE === 'demo') {
      const unlocked = isUnlocked(courseId);
      const admin = isDemoAdmin();
      return demoAll()
        .filter((r) => r.course_id === courseId)
        .filter((r) => !r.deleted_at)        // 지운 것은 관리 페이지에서만 봅니다
        .filter((r) => admin || r.visibility === 'public' || (unlocked && r.visibility === 'class'))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }

    const supa = await getClient();
    const { data, error } = await supa
      .from('submissions')
      .select('*')
      .eq('course_id', courseId)
      .is('deleted_at', null)   // 관리자로 로그인해 있어도 갤러리에는 지운 것을 띄우지 않습니다
      .order('created_at', { ascending: false });
    if (error) throw error;

    // 비공개 파일은 시간 제한이 걸린 임시 주소를 그때그때 발급받습니다.
    return Promise.all((data || []).map(withFileUrl));
  }

  /** 모든 과목의 "모두 공개" 결과물만 모아 보여 줄 때 (갤러리 첫 화면) */
  async function listPublic(limit = 60) {
    if (MODE === 'demo') {
      return demoAll()
        .filter((r) => !r.deleted_at && r.visibility === 'public')
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, limit);
    }
    const supa = await getClient();
    const { data, error } = await supa
      .from('submissions')
      .select('*')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return Promise.all((data || []).map(withFileUrl));
  }

  async function withFileUrl(row) {
    if (!row.file_path) return row;
    try {
      const supa = await getClient();
      const { data } = await supa.storage.from(CFG.bucket).createSignedUrl(row.file_path, 60 * 60);
      return { ...row, file_url: data?.signedUrl || null };
    } catch {
      return { ...row, file_url: null };
    }
  }

  /* ---------- 결과물 올리기 ---------- */

  /**
   * @param {Object} p
   * @param {string} p.courseId  과목 id
   * @param {string} p.title     제목
   * @param {string} p.author    이름
   * @param {string} p.studentNo 학번(선택)
   * @param {string} p.description 설명(선택)
   * @param {string} p.password  본인 확인용 비밀번호 (나중에 스스로 지울 때 씁니다)
   * @param {string} p.linkUrl   링크 제출일 때
   * @param {File}   p.file      파일 제출일 때
   * @param {'class'|'public'} p.visibility
   * @param {(pct:number)=>void} [p.onProgress]
   */
  async function createSubmission(p) {
    const now = new Date().toISOString();
    const base = {
      course_id: p.courseId,
      title: p.title.trim(),
      author_name: p.author.trim(),
      student_no: (p.studentNo || '').trim() || null,
      description: (p.description || '').trim() || null,
      link_url: (p.linkUrl || '').trim() || null,
      visibility: p.visibility === 'public' ? 'public' : 'class',
      created_at: now,
    };

    if (MODE === 'demo') {
      const rows = demoAll();
      const row = {
        ...base,
        // 데모는 이 브라우저에만 남는 연습용이라 비밀번호를 그대로 둡니다.
        // 진짜 저장(Supabase)에서는 해시만 서버에 남고 원문은 어디에도 남지 않습니다.
        pw: String(p.password || '').trim(),
        deleted_at: null,
        id: 'demo-' + Math.random().toString(36).slice(2, 10),
        file_name: p.file ? p.file.name : null,
        file_size: p.file ? p.file.size : null,
        file_path: null,
        file_url: null,
      };
      // 작은 이미지에 한해 미리보기를 위해 브라우저에 담아 둡니다.
      if (p.file && p.file.type.startsWith('image/') && p.file.size < 700 * 1024) {
        row.file_url = await readAsDataUrl(p.file);
      }
      rows.push(row);
      if (!demoSave(rows)) {
        throw new Error('브라우저 저장 공간이 가득 찼습니다. 데모 자료를 비우고 다시 시도하세요.');
      }
      return row;
    }

    const supa = await getClient();
    let filePath = null;

    if (p.file) {
      const ext = (p.file.name.split('.').pop() || '').toLowerCase();
      const rand = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      filePath = `${p.courseId}/${rand}.${ext}`;
      const { error: upErr } = await supa.storage
        .from(CFG.bucket)
        .upload(filePath, p.file, { cacheControl: '3600', upsert: false });
      if (upErr) throw friendly(upErr, p.courseId);
    }

    // 제출물과 비밀번호를 한 번에 넣습니다.
    // 표에 직접 넣는 길은 막아 두었기 때문에, 비밀번호 없는 제출물은 생기지 않습니다.
    const { data, error } = await supa.rpc('create_submission', {
      p_course_id:   base.course_id,
      p_title:       base.title,
      p_author:      base.author_name,
      p_student_no:  base.student_no,
      p_description: base.description,
      p_link_url:    base.link_url,
      p_file_path:   filePath,
      p_file_name:   p.file ? p.file.name : null,
      p_file_size:   p.file ? p.file.size : null,
      p_visibility:  base.visibility,
      p_password:    String(p.password || ''),
    });
    if (error) {
      // 글이 안 들어갔는데 파일만 남는 일이 없도록 치웁니다.
      if (filePath) await supa.storage.from(CFG.bucket).remove([filePath]).catch(() => {});
      throw friendly(error, p.courseId);
    }
    return data;
  }

  /**
   * 올린 본인이 공개 범위를 바꿉니다(수업 공개 ↔ 모두 공개). 이름과 삭제 암호가 맞아야 합니다.
   * @returns {Promise<boolean>} 맞지 않으면 false
   */
  async function setOwnVisibility(id, name, password, visibility) {
    const same = (a, b) =>
      String(a || '').trim().toLowerCase().replace(/\s+/g, '') ===
      String(b || '').trim().toLowerCase().replace(/\s+/g, '');
    if (MODE === 'demo') {
      const rows = demoAll();
      const row = rows.find((r) => r.id === id && !r.deleted_at);
      if (!row) throw new Error('이미 지워졌거나 찾을 수 없는 결과물입니다.');
      if (!same(name, row.author_name) || String(password || '') !== String(row.pw || '')) return false;
      row.visibility = visibility === 'public' ? 'public' : 'class';
      demoSave(rows);
      return true;
    }
    const supa = await getClient();
    const { data, error } = await supa.rpc('set_own_visibility', {
      p_id: id, p_name: String(name || ''), p_password: String(password || ''), p_visibility: visibility,
    });
    if (error) {
      if (/set_own_visibility|could not find the function/i.test(error.message || '')) {
        throw new Error('아직 서버에 이 기능이 켜지지 않았습니다. 담당 교수에게 말씀해 주세요.');
      }
      throw error;
    }
    return data === true;
  }

  /** 권한 오류를 '수업 코드를 다시 확인해 주세요'로 바꾸고, 브라우저의 해제 기억도 지웁니다. */
  function friendly(err, courseId) {
    const msg = String((err && err.message) || err || '');
    if (/row-level security|수업 코드를 먼저/i.test(msg)) {
      lock(courseId);
      const e = new Error('수업 코드 확인이 풀렸습니다. 수업 코드를 다시 입력한 뒤 제출해 주세요. (관리자 로그인·로그아웃을 하면 다시 확인해야 합니다.)');
      e.needsCode = true;
      return e;
    }
    if (/exceeded the maximum allowed size|payload too large|413/i.test(msg)) {
      return new Error(`파일이 너무 큽니다. 최대 ${CFG.maxFileMB}MB까지 올릴 수 있습니다. 영상은 유튜브에 올린 뒤 링크로 제출해 주세요.`);
    }
    return err;
  }

  /* ---------- 올린 본인이 지우기 ---------- */

  /**
   * 이름과 비밀번호가 둘 다 맞아야 지워집니다.
   * 방문자 화면에서는 사라지지만 실제로는 '지운 시각'만 남으므로,
   * 담당 교수가 관리 페이지에서 되살릴 수 있습니다.
   * @returns {Promise<boolean>} 맞지 않으면 false
   */
  async function deleteOwn(id, name, password) {
    const same = (a, b) =>
      String(a || '').trim().toLowerCase().replace(/\s+/g, '') ===
      String(b || '').trim().toLowerCase().replace(/\s+/g, '');

    if (MODE === 'demo') {
      const rows = demoAll();
      const row = rows.find((r) => r.id === id && !r.deleted_at);
      if (!row) throw new Error('이미 지워졌거나 찾을 수 없는 결과물입니다.');
      if (!same(name, row.author_name) || String(password || '') !== String(row.pw || '')) {
        return false;
      }
      row.deleted_at = new Date().toISOString();
      demoSave(rows);
      return true;
    }

    const supa = await getClient();
    const { data, error } = await supa.rpc('delete_own_submission', {
      p_id: id, p_name: String(name || ''), p_password: String(password || ''),
    });
    if (error) throw error;
    return data === true;
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
      r.readAsDataURL(file);
    });
  }

  /* ---------- 관리자 ---------- */

  function isDemoAdmin() { return store.get('demo:admin') === '1'; }

  async function signIn(email, password) {
    if (MODE === 'demo') {
      // 데모에서는 아무 값이나 넣으면 관리자 화면을 볼 수 있습니다.
      store.set('demo:admin', '1');
      return { email: email || '데모 관리자' };
    }
    const supa = await getClient();
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw error;
    store.del(UNLOCK_KEY);   // 접속 계정이 바뀌어 예전 수업 코드 해제 기록은 더 이상 통하지 않습니다
    return data.user;
  }

  async function signOut() {
    if (MODE === 'demo') { store.del('demo:admin'); return; }
    const supa = await getClient();
    await supa.auth.signOut();
    await supa.auth.signInAnonymously(); // 다시 일반 방문자로
    store.del(UNLOCK_KEY);
  }

  /** 지금 관리자로 로그인되어 있는지 */
  async function currentAdmin() {
    if (MODE === 'demo') return isDemoAdmin() ? { email: '데모 관리자' } : null;
    const supa = await getClient();
    const { data } = await supa.auth.getUser();
    const user = data?.user;
    if (!user || user.is_anonymous) return null;
    const { data: ok } = await supa.rpc('is_admin');
    return ok ? user : null;
  }

  /** 로그인한 관리자의 비밀번호를 바꿉니다. */
  async function changePassword(newPassword) {
    if (MODE === 'demo') return;            // 데모에는 실제 계정이 없습니다
    const supa = await getClient();
    const { error } = await supa.auth.updateUser({ password: newPassword });
    if (!error) return;
    // 자주 나오는 영어 오류는 우리말로 바꿔 보여 줍니다.
    const ko = {
      same_password: '지금 쓰는 비밀번호와 다른 것으로 정해 주세요.',
      weak_password: '너무 쉬운 비밀번호입니다. 더 길고 복잡하게 정해 주세요.',
      reauthentication_needed: '보안을 위해 로그아웃했다가 다시 로그인한 뒤 바꿔 주세요.',
    };
    throw new Error(ko[error.code] || error.message);
  }

  /** 모든 과목의 모든 제출물 (관리자 전용 — 권한은 서버가 확인) */
  async function listAll() {
    if (MODE === 'demo') {
      return demoAll().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }
    const supa = await getClient();
    const { data, error } = await supa
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all((data || []).map(withFileUrl));
  }

  async function setVisibility(id, visibility) {
    if (MODE === 'demo') {
      const rows = demoAll();
      const row = rows.find((r) => r.id === id);
      if (row) { row.visibility = visibility; demoSave(rows); }
      return;
    }
    const supa = await getClient();
    const { error } = await supa.from('submissions').update({ visibility }).eq('id', id);
    if (error) throw error;
  }

  /** 학생이 지운 결과물을 되살립니다 (관리자 전용). */
  async function restoreSubmission(id) {
    if (MODE === 'demo') {
      const rows = demoAll();
      const row = rows.find((r) => r.id === id);
      if (row) { row.deleted_at = null; demoSave(rows); }
      return;
    }
    const supa = await getClient();
    const { error } = await supa.from('submissions').update({ deleted_at: null }).eq('id', id);
    if (error) throw error;
  }

  async function removeSubmission(id) {
    if (MODE === 'demo') {
      demoSave(demoAll().filter((r) => r.id !== id));
      return;
    }
    const supa = await getClient();
    const { data: row } = await supa.from('submissions').select('file_path').eq('id', id).single();
    if (row?.file_path) {
      await supa.storage.from(CFG.bucket).remove([row.file_path]);
    }
    const { error } = await supa.from('submissions').delete().eq('id', id);
    if (error) throw error;
  }

  /* ---------- 자료실 수강생 전용 자료 ---------- */
  // 묶음은 courses 표의 한 줄이고, 그 묶음의 코드(수업 코드)를 푼 사람만 파일과 링크를 엽니다.
  // 권한은 모두 서버가 판단합니다(supabase/4-class-materials.sql).

  const notSetUp = (err) =>
    /PGRST202|PGRST205|42P01|could not find the (function|table)|does not exist/i
      .test(`${err?.code || ''} ${err?.message || ''}`);

  /**
   * 자료실 목록(누구나): 제목, 소개, 묶음 이름, 이 브라우저가 열 수 있는지(unlocked).
   * 데모 모드이거나 서버 설정 전이면 빈 목록을 돌려줍니다.
   */
  async function listMaterials() {
    if (MODE === 'demo') return [];
    const supa = await getBareClient();
    const { data, error } = await supa.rpc('list_class_materials');
    if (error) {
      if (notSetUp(error)) return [];
      throw error;
    }
    return data || [];
  }

  /**
   * 자료 하나를 열 주소를 받습니다. 파일이면 5분짜리 임시 내려받기 주소, 링크면 그 링크.
   * 코드를 풀지 않았거나 풀린 기록이 없어졌으면 needsCode 오류를 냅니다.
   */
  async function openMaterial(id, courseId) {
    const supa = await getClient();
    const { data: row, error } = await supa
      .from('class_materials')
      .select('file_path, file_name, link_url')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      lock(courseId);
      const e = new Error('코드 확인이 풀렸습니다. 코드를 다시 넣어 주세요.');
      e.needsCode = true;
      throw e;
    }
    if (row.link_url && !row.file_path) return row.link_url;
    const { data, error: urlErr } = await supa.storage
      .from(CFG.materialsBucket)
      .createSignedUrl(row.file_path, 60 * 5, { download: row.file_name || true });
    if (urlErr) throw urlErr;
    return data.signedUrl;
  }

  /** (관리자) 묶음 목록. courses 표는 관리자만 읽습니다. */
  async function listMaterialGroups() {
    if (MODE === 'demo') return [];
    const supa = await getClient();
    const { data, error } = await supa
      .from('courses')
      .select('id, title, term, is_open, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /** (관리자) 새 묶음 만들기. 연수처럼 수업 과목이 아닌 것에 씁니다. */
  async function createMaterialGroup({ id, title, term, code }) {
    const supa = await getClient();
    const { error } = await supa.from('courses').insert({
      id, title, term: term || null, code_hash: 'x',   // 'x' 는 어떤 코드와도 맞지 않습니다
    });
    if (error) {
      if (/duplicate key/i.test(error.message || '')) throw new Error(`이미 있는 묶음 id 입니다: ${id}`);
      throw error;
    }
    await setGroupCode(id, code);
  }

  /** (관리자) 묶음 코드 바꾸기. 수업 과목이면 결과물 갤러리 제출 코드도 같이 바뀝니다. */
  async function setGroupCode(id, code) {
    const supa = await getClient();
    const { error } = await supa.rpc('set_course_code', { p_course_id: id, p_code: code });
    if (error) throw error;
  }

  /** (관리자) 묶음 열고 닫기. 닫으면 새로 코드를 풀 수 없고, 목록에서도 숨습니다. */
  async function setGroupOpen(id, isOpen) {
    const supa = await getClient();
    const { error } = await supa.from('courses').update({ is_open: isOpen }).eq('id', id);
    if (error) throw error;
  }

  /** (관리자) 올린 전용 자료 전부 */
  async function listMaterialsAdmin() {
    const supa = await getClient();
    const { data, error } = await supa
      .from('class_materials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (notSetUp(error)) {
        const e = new Error('서버 설정 전입니다.');
        e.notSetUp = true;
        throw e;
      }
      throw error;
    }
    return data || [];
  }

  /** (관리자) 전용 자료 올리기: 파일 또는 링크 */
  async function createMaterial({ courseId, title, summary, file, linkUrl }) {
    const supa = await getClient();
    let filePath = null;
    if (file) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const rand = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      filePath = `${courseId}/${rand}${ext ? '.' + ext : ''}`;
      const { error: upErr } = await supa.storage
        .from(CFG.materialsBucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (upErr) {
        if (/exceeded the maximum allowed size|payload too large|413/i.test(upErr.message || '')) {
          throw new Error(`파일이 너무 큽니다. 최대 ${CFG.materialsMaxMB}MB까지 올릴 수 있습니다. 큰 파일은 구글 드라이브에 두고 링크로 올려 주세요.`);
        }
        throw upErr;
      }
    }
    const { error } = await supa.from('class_materials').insert({
      course_id: courseId,
      title: title.trim(),
      summary: (summary || '').trim() || null,
      file_path: filePath,
      file_name: file ? file.name : null,
      file_size: file ? file.size : null,
      link_url: file ? null : ((linkUrl || '').trim() || null),
    });
    if (error) {
      if (filePath) await supa.storage.from(CFG.materialsBucket).remove([filePath]).catch(() => {});
      throw error;
    }
  }

  /** (관리자) 전용 자료 지우기. 올린 파일도 함께 지웁니다. */
  async function removeMaterial(row) {
    const supa = await getClient();
    if (row.file_path) {
      const { error: rmErr } = await supa.storage.from(CFG.materialsBucket).remove([row.file_path]);
      if (rmErr) throw rmErr;
    }
    const { error } = await supa.from('class_materials').delete().eq('id', row.id);
    if (error) throw error;
  }

  /* ---------- 사이트 설정 (관리자가 켜고 끄는 값) ---------- */

  /** 읽기는 settings.js 의 readSetting() 이 맡습니다. 여기서는 저장만 합니다. */
  async function setSetting(key, value) {
    if (MODE === 'demo') {
      store.set('setting:' + key, JSON.stringify(value));
      return;
    }
    const supa = await getClient();
    const { error } = await supa
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  /** 데모 자료 전부 지우기 */
  function clearDemo() { store.del(DEMO_KEY); store.del(UNLOCK_KEY); store.del('demo:admin'); }

  return {
    mode: MODE,
    listCourses, getCourse,
    isUnlocked, verifyUnlock, unlock, lock,
    listSubmissions, listPublic, createSubmission, deleteOwn,
    signIn, signOut, currentAdmin, changePassword, listAll, setVisibility, setOwnVisibility,
    removeSubmission, restoreSubmission,
    setSetting,
    listMaterials, openMaterial,
    listMaterialGroups, createMaterialGroup, setGroupCode, setGroupOpen,
    listMaterialsAdmin, createMaterial, removeMaterial,
    clearDemo,
  };
})();
