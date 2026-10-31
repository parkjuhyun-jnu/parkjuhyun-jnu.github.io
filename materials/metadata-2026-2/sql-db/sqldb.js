/* ==========================================================================
   DB와 SQL 실습 공통 — 브라우저 안에서 SQLite(sql.js)를 돌린다. 서버·가입 없음.
   학생이 무엇을 바꿔도 그 브라우저 안에서만 바뀌고, 새로 고치면 처음 상태로 돌아간다.
   ========================================================================== */
const SQLDB = (() => {
  const BASE = 'materials/metadata-2026-2/sql-db/';
  const VER = '20261031';
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
  let SQL = null, baseBytes = null;

  // 표마다 한 줄 설명 (ERD 머리와 구조 보기에 쓴다)
  const DESC = {
    book: '도서 (서지 레코드 = 판)', author: '저자·역자', book_author: '도서↔사람 잇기 (다대다)',
    publisher: '출판사', kdc: 'KDC 분류', item: '소장 자료 (실물 한 권)',
    member: '이용자 (가상)', loan: '대출 기록', reservation: '예약',
  };

  async function init() {
    if (SQL) return;
    SQL = await initSqlJs({ locateFile: f => CDN + f });
    const text = await (await fetch(BASE + 'library.sql?v=' + VER)).text();
    const db = new SQL.Database();
    db.exec(text);
    baseBytes = db.export();
    db.close();
  }
  function fresh() {
    const db = new SQL.Database(baseBytes);
    db.exec('PRAGMA foreign_keys = ON');
    return db;
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderResult(el, res, maxRows = 300) {
    if (!res) { el.innerHTML = ''; return; }
    const rows = res.values.slice(0, maxRows);
    const head = res.columns.map(c => `<th>${esc(c)}</th>`).join('');
    const body = rows.map(r => '<tr>' + r.map(v =>
      v === null ? '<td class="null">NULL</td>'
        : typeof v === 'number' ? `<td class="num">${esc(v)}</td>`
          : `<td>${esc(v instanceof Uint8Array ? '[blob]' : v)}</td>`).join('') + '</tr>').join('');
    el.innerHTML = `<div class="result-wrap"><table class="result-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="result-meta">${res.values.length}행 · ${res.columns.length}열${res.values.length > maxRows ? ` (앞 ${maxRows}행만 보임)` : ''}</p>`;
  }

  // SQLite 오류를 처음 배우는 사람 말로 풀어 준다. 원래 메시지도 함께 보인다.
  function explain(msg) {
    const m = String(msg);
    let t;
    if ((t = m.match(/no such table: (\S+)/))) t = `‘${t[1]}’이라는 테이블이 없습니다. 테이블 이름 철자를 확인하세요(아래 테이블 목록).`;
    else if ((t = m.match(/no such column: (\S+)/))) t = `‘${t[1]}’이라는 열이 없습니다. 열 이름 철자와, 별칭(b.title의 b)이 FROM·JOIN에서 정한 것과 같은지 확인하세요.`;
    else if ((t = m.match(/ambiguous column name: (\S+)/))) t = `‘${t[1]}’ 열이 두 테이블에 다 있어 어느 쪽인지 모릅니다. 별칭.열 (예: b.${t[1]}) 로 적으세요.`;
    else if ((t = m.match(/near "(.*?)": syntax error/))) t = `‘${t[1]}’ 근처에서 문법이 맞지 않습니다. 쉼표·따옴표·괄호, 그리고 순서(SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY)를 확인하세요.`;
    else if (/incomplete input/.test(m)) t = '문장이 끝나지 않았습니다. 여는 괄호나 작은따옴표를 닫았는지 확인하세요.';
    else if (/UNIQUE constraint failed|PRIMARY KEY/.test(m)) t = '이미 같은 키 값이 있습니다. 기본 키(PK)는 겹칠 수 없습니다. 실습 DB 초기화 후 다시 해 보세요.';
    else if (/FOREIGN KEY constraint failed/.test(m)) t = '외래 키 규칙에 걸렸습니다. 다른 테이블에 없는 번호를 넣었거나, 다른 행이 아직 가리키는 행을 지우려 했습니다.';
    else if (/NOT NULL constraint failed: (\S+)/.test(m)) t = `비워 둘 수 없는 열(${m.match(/NOT NULL constraint failed: (\S+)/)[1]})에 값이 없습니다.`;
    else if (/no such function: (\S+)/.test(m)) t = `SQLite에 없는 함수입니다(${m.match(/no such function: (\S+)/)[1]}). 다른 DBMS의 함수일 수 있습니다.`;
    return (t ? esc(t) + '<br>' : '') + `<span class="small muted">SQLite 메시지: ${esc(m)}</span>`;
  }

  // 채점용 정규화 — build/db/make_db.py 의 norm_cell·result_key 와 반드시 같아야 한다
  function normCell(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
    if (v instanceof Uint8Array) return '[blob]';
    return String(v);
  }
  async function resultKey(res, ordered) {
    const cols = res ? res.columns.length : 0;
    const lines = (res ? res.values : []).map(r => r.map(normCell).join('\t'));
    if (!ordered) lines.sort();
    const body = cols + '\n' + lines.join('\n');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function tables(db) {
    const names = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")[0];
    return (names ? names.values.map(r => r[0]) : []).map(name => {
      const cols = db.exec(`PRAGMA table_info(${name})`)[0].values.map(r => ({ name: r[1], type: r[2], notnull: !!r[3], pk: r[5] > 0 }));
      const fkr = db.exec(`PRAGMA foreign_key_list(${name})`)[0];
      const fks = fkr ? fkr.values.map(r => ({ table: r[2], from: r[3], to: r[4] })) : [];
      const count = db.exec(`SELECT COUNT(*) FROM ${name}`)[0].values[0][0];
      return { name, cols, fks, count, desc: DESC[name] || '' };
    });
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem('sqldb:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('sqldb:' + k, JSON.stringify(v)); } catch { /* 저장 못 해도 실습은 된다 */ } },
  };

  return { BASE, VER, init, fresh, renderResult, explain, resultKey, tables, esc, store, DESC };
})();
