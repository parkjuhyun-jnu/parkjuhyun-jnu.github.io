/* 메타데이터 개요(교재 1장) 실습 7개. 서버·가입 없음, 입력은 브라우저 밖으로 나가지 않는다.
   #1~#6은 '가려내기'(보기 가운데 하나 고르기), #2는 트리플 만들기, #7은 개념모델 그리기. */
(() => {
  const app = document.getElementById('app');
  const tabs = document.getElementById('tabs');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  /* ---------- 가려내기 공통 엔진 ---------- */
  // rounds: [{title, intro, cats: [{key, label, tip}], items: [{text, hint, cat, why}]}]
  function classify(root, lab) {
    let r = 0;
    const renderRound = () => {
      const round = lab.rounds[r];
      const items = round.shuffle === false ? round.items : shuffle(round.items);
      let i = 0, right = 0, missed = 0;
      const stage = h(`<div class="stage">
        <h3>${esc(round.title)} <span class="small muted">(${r + 1}/${lab.rounds.length})</span></h3>
        <p class="lab-intro">${round.intro}</p>
        <div class="legend-row">${round.cats.map((c) => `<span title="${esc(c.tip || '')}"><b>${esc(c.label)}</b>${c.tip ? ' · ' + esc(c.tip) : ''}</span>`).join('')}</div>
        <div class="pips">${items.map(() => '<i></i>').join('')}</div>
        <p class="card-q"></p>
        <div class="choice"></div>
        <p class="say" aria-live="polite"></p>
        <p class="small muted" style="margin:.6rem 0 0">맞힌 수 <span class="tally">0</span> / ${items.length}</p>
      </div>`);
      root.appendChild(stage);
      const pips = stage.querySelectorAll('.pips i');
      const q = stage.querySelector('.card-q');
      const choice = stage.querySelector('.choice');
      const say = stage.querySelector('.say');
      const tally = stage.querySelector('.tally');
      const show = () => {
        pips.forEach((p, k) => p.classList.toggle('now', k === i));
        const it = items[i];
        q.innerHTML = esc(it.text) + (it.hint ? `<small>${esc(it.hint)}</small>` : '');
        choice.innerHTML = '';
        say.textContent = ''; say.className = 'say';
        let tried = false;
        round.cats.forEach((c) => {
          const b = h(`<button type="button">${esc(c.label)}</button>`);
          b.addEventListener('click', () => {
            if (c.key === it.cat) {
              b.classList.add('right');
              choice.querySelectorAll('button').forEach((o) => { o.disabled = true; });
              if (!tried) { right++; pips[i].classList.add('ok'); } else { pips[i].classList.add('miss'); }
              tally.textContent = right;
              say.className = 'say ok'; say.textContent = '맞습니다. ' + (it.why || '');
              setTimeout(() => { i++; i < items.length ? show() : finish(); }, tried ? 1400 : 1000);
            } else {
              if (!tried) missed++;
              tried = true;
              b.classList.add('wrong'); b.disabled = true;
              say.className = 'say no'; say.textContent = (it.no && it.no[c.key]) || `${c.label}이(가) 아닙니다. 다시 골라 보세요.`;
            }
          });
          choice.appendChild(b);
        });
      };
      const finish = () => {
        pips.forEach((p) => p.classList.remove('now'));
        q.innerHTML = `${round.title} 끝. ${items.length}개 가운데 처음에 바로 맞힌 것 ${right}개.`;
        choice.innerHTML = '';
        say.className = 'say'; say.textContent = round.outro || '';
        const row = h('<div class="btn-row"></div>');
        row.appendChild(h('<button type="button" class="btn btn--ghost btn--sm">이 단계 다시 하기</button>')).addEventListener('click', () => { stage.remove(); renderRound(); });
        if (r + 1 < lab.rounds.length) {
          row.appendChild(h('<button type="button" class="btn btn--sm">다음 단계</button>')).addEventListener('click', () => { r++; renderRound(); });
        }
        stage.appendChild(row);
      };
      show();
    };
    renderRound();
  }

  /* ---------- 실습 자료 ---------- */
  const LAB1 = {
    rounds: [
      {
        title: '1단계 · 데이터인가, 메타데이터인가',
        intro: '자원 그 자체는 <b>데이터</b>, 자원을 설명하는 정보는 <b>메타데이터</b>입니다. 항목을 읽고 어느 쪽인지 고르세요. 값은 수업용 예입니다.',
        cats: [{ key: 'd', label: '데이터', tip: '자원 그 자체' }, { key: 'm', label: '메타데이터', tip: '자원에 대한 정보' }],
        items: [
          { text: '스마트폰 사진 파일의 화면(픽셀) 자체', cat: 'd', why: '사진 자체가 데이터입니다.' },
          { text: '사진의 촬영일 2025-08-03 14:21', cat: 'm', why: '사진에 대한 정보, 곧 메타데이터입니다. 이것으로 ‘작년 여름’을 찾습니다.' },
          { text: '사진의 위치 정보 ‘제주 서귀포시’', cat: 'm', why: '위치 정보는 사진을 설명하는 메타데이터입니다.' },
          { text: '앨범 제목 ‘제주 가족여행’', cat: 'm', why: '사람이 붙인 설명이지만 역시 메타데이터입니다.' },
          { text: '책의 본문 글', cat: 'd', why: '본문은 책이라는 자원 자체, 데이터입니다.' },
          { text: '책 표제면에 적힌 서명·저자·출판사', cat: 'm', why: '표제면은 도서관이 메타데이터를 옮겨 오는 정보원입니다.' },
          { text: '한글 문서를 저장할 때 생긴 작성자·수정일', cat: 'm', why: '문서에 대한 정보가 자동으로 만들어진 메타데이터입니다.' },
          { text: '음악 파일의 소리', cat: 'd', why: '소리 자체가 데이터입니다.' },
          { text: '음악 앱에 보이는 곡명·작곡가·수록 앨범', cat: 'm', why: '음악 데이터베이스의 곡 정보는 메타데이터입니다.' },
          { text: '도서관 카드목록의 카드 한 장', cat: 'm', why: '메타데이터는 꼭 디지털일 필요가 없습니다. 카드목록도 메타데이터입니다.' },
          { text: '어떤 책의 서평을 100편 모아 서평의 문체를 연구할 때, 그 서평들', cat: 'd', why: '책에 대해서는 메타데이터지만 서평 자체를 연구할 때는 데이터입니다. 둘의 경계는 활용 방식에 따라 달라집니다.' },
        ],
        outro: '데이터와 메타데이터의 경계는 고정되어 있지 않다는 점(마지막 서평 예)까지 기억해 두세요.',
      },
      {
        title: '2단계 · 누가 만들었나',
        intro: '제주 사진의 메타데이터를 다시 봅니다. <b>기기가 자동으로</b> 기록한 것인지, <b>사람이 직접</b> 붙인 것인지 고르세요.',
        cats: [{ key: 'a', label: '기기가 자동으로', tip: '테크니컬 메타데이터 일부는 컴퓨터가 생성' }, { key: 'p', label: '사람이 직접', tip: '설명·제목·이름' }],
        items: [
          { text: '촬영 일시', cat: 'a', why: '카메라가 찍는 순간 저절로 기록합니다.' },
          { text: '카메라 기종', cat: 'a', why: '기기가 자동으로 적습니다.' },
          { text: '해상도 4032×3024, 파일 크기 2.1MB', cat: 'a', why: '파일 형식·크기 같은 테크니컬 정보는 자동 생성됩니다.' },
          { text: '앨범 제목 ‘제주 가족여행’', cat: 'p', why: '제목은 사람이 붙입니다.' },
          { text: '사진 설명 한 줄 ‘외할머니와 바다에서’', cat: 'p', why: '설명은 사람이 씁니다.' },
          { text: '얼굴 묶음에 붙인 이름 ‘가족’', cat: 'p', why: '얼굴을 찾아 묶는 일은 기기가 해도, 그 묶음에 이름을 붙이는 일은 사람이 합니다.' },
        ],
        outro: '메타데이터는 전문가만 만들지 않습니다. 파일 작성자, 이용자, 알고리즘이 함께 만듭니다.',
      },
    ],
  };

  const LAB3 = {
    rounds: [
      {
        title: '1단계 · 전자책 한 권에 붙는 여러 유형',
        intro: '전자책 『어린 왕자』(EPUB 파일, 수업용·값은 가상)에 붙은 메타데이터입니다. NISO의 구분으로 어느 유형인지 고르세요. 테크니컬·보존·저작권은 관리 메타데이터의 하위입니다.',
        cats: [
          { key: 'desc', label: '기술', tip: '찾고 알아보기' }, { key: 'tech', label: '테크니컬', tip: '열어서 보여 주기' }, { key: 'pres', label: '보존', tip: '오래 안전하게' },
          { key: 'rights', label: '저작권', tip: '써도 되는지' }, { key: 'struct', label: '구조', tip: '책 안에서 이동' }, { key: 'markup', label: '마크업 언어', tip: '본문 속 표시' },
        ],
        items: [
          { text: '표제·저자·주제·발행일', cat: 'desc', why: '자원을 찾고 이해하는 정보, 기술 메타데이터입니다.' },
          { text: 'EPUB 형식 · 3.2MB · 생성일', cat: 'tech', why: '파일을 디코딩·렌더링하는 데 필요한 정보, 테크니컬입니다.' },
          { text: '체크섬(파일 지문)과 보존 기록', cat: 'pres', why: '파일의 장기관리를 위한 보존 메타데이터입니다.' },
          { text: '저작권자 · 라이선스 기간', cat: 'rights', why: '지적재산권에 관한 저작권 메타데이터입니다.' },
          { text: '장 순서, 목차에서 본문으로 가는 링크', cat: 'struct', why: '부분과 부분의 관계, 구조 메타데이터입니다. 항해를 맡습니다.' },
          { text: '본문 속 <h1>·<p>·<em> 태그', cat: 'markup', why: '콘텐츠에 삽입한 플래그로 헤딩·단락·강조를 표시하는 마크업 언어입니다.' },
          { text: '이용 조건 ‘비영리 재사용 허용’', cat: 'rights', why: '권한·라이선스 정보는 저작권 메타데이터입니다.' },
          { text: '스캔한 쪽 이미지 파일 0001.tif, 0002.tif…의 순서', cat: 'struct', why: '쪽 순서는 구조 메타데이터입니다. 쪽 번호로 바로 이동할 수 있게 합니다.' },
          { text: '쪽 이미지 파일마다 적힌 해상도·압축률·포맷', cat: 'tech', why: '파일별 물리적 특징은 테크니컬 메타데이터입니다.' },
          { text: '원본 고서의 훼손 상태와 수선 조치 기록', cat: 'pres', why: '물리적 상태와 이루어진 액션의 기록은 보존 메타데이터입니다.' },
          { text: '주제어 ‘동화; 우정’, 장르 ‘소설’', cat: 'desc', why: '주제·장르는 기술 메타데이터의 대표 속성입니다.' },
        ],
        outro: '자원 하나에 여러 유형이 동시에 붙고, 유형마다 맡는 목적이 다릅니다.',
      },
      {
        title: '2단계 · 학자마다 다른 구분',
        intro: '같은 항목을 어느 학자가 <b>독립 유형</b>으로 두는지 묻습니다. 교재 표 1-2~1-5를 바탕으로 한 질문입니다.',
        cats: [{ key: 'niso', label: 'NISO(Riley)' }, { key: 'gil', label: 'Gilliland' }, { key: 'jt', label: 'Joudrey & Taylor' }, { key: 'none', label: '네 학자 모두' }],
        items: [
          { text: '‘이용’ 메타데이터(대출 기록·검색 로그)를 독립 유형으로 둔 사람은?', cat: 'gil', why: 'Gilliland는 관리·기술·보존·테크니컬·이용의 다섯 유형을 둡니다. NISO에는 없고, Joudrey & Taylor와 Miller는 관리의 하위입니다.' },
          { text: '‘마크업 언어’를 유형으로 둔 구분은?', cat: 'niso', why: 'NISO의 네 유형(기술·관리·구조·마크업 언어)에만 있습니다.' },
          { text: '관리 메타데이터 아래에 이미지 품질 평가·메타-메타데이터·추적까지 여덟 하위 유형을 둔 사람은?', cat: 'jt', why: 'Joudrey & Taylor는 관리를 가장 넓게 잡습니다.' },
          { text: '‘기술’과 ‘관리’를 독립 유형으로 두는 구분은?', cat: 'none', why: '기술과 관리는 네 학자 모두 독립 유형입니다. 차이는 관리를 얼마나 넓게 보느냐에서 생깁니다.' },
          { text: '테크니컬과 보존을 관리의 하위가 아닌 독립 유형으로 세운 사람은?', cat: 'gil', why: 'Gilliland만 독립 유형으로 둡니다.' },
        ],
        outro: '교재는 유형 구분이 유용하지만 인공적이어서 절대적이지도 배타적이지도 않다고 정리합니다. 연습문제 3번은 이 비교를 교재의 표로 직접 쓰는 문제입니다.',
      },
    ],
  };

  const LAB4 = {
    rounds: [
      {
        title: '1단계 · 표준 이름 보고 유형 고르기',
        intro: '표준의 이름을 보고 <b>주된 특성</b>이 구조·내용·값·교환 가운데 어느 쪽인지 고르세요. 이력서 비유: 어떤 칸 / 어떻게 적나 / 무엇 중 고르나 / 어떤 파일로.',
        cats: [{ key: 's', label: '구조표준', tip: '어떤 칸' }, { key: 'c', label: '내용표준', tip: '어떻게 적나' }, { key: 'v', label: '값표준', tip: '무엇 중 고르나' }, { key: 'x', label: '교환표준', tip: '어떤 파일로' }],
        items: [
          { text: 'DCMES (더블린 코어 15개 요소)', cat: 's', why: '요소세트, 곧 어떤 칸을 둘지 정한 구조표준입니다.' },
          { text: '한국목록규칙 제4판 (KCR4)', cat: 'c', why: '목록규칙은 값을 어떻게 적을지 정한 내용표준입니다. 구조·값에 관한 내용도 담습니다.' },
          { text: 'LCSH (미국 의회도서관 주제명표목표)', cat: 'v', why: '주제명표목표는 칸에 넣을 용어를 정한 값표준입니다.' },
          { text: 'MARC21 (ISO 2709)', cat: 'x', why: '기계가독 형식의 교환표준입니다. 구조표준의 성격도 함께 갖습니다.' },
          { text: 'RDA (Resource Description and Access)', cat: 'c', why: '도서관의 대표 내용표준입니다.' },
          { text: 'DDC (듀이십진분류법)', cat: 'v', why: '분류체계는 값표준입니다.' },
          { text: 'EAD (Encoded Archival Description)', cat: 's', why: '기록물의 구조표준입니다. 교환 포맷도 들어 있지만 주된 특성은 구조입니다.' },
          { text: 'ISO 639 언어 코드 (예: kor)', cat: 'v', why: '인코딩스킴, 곧 정해진 코드로 적게 하는 값표준입니다.' },
          { text: 'XML', cat: 'x', why: '대부분의 구조표준이 XML로 요소세트를 표현합니다. 형식(교환)표준입니다.' },
          { text: 'DACS (Describing Archives: A Content Standard)', cat: 'c', why: '이름 그대로 기록관의 내용표준입니다.' },
          { text: 'VRA Core', cat: 's', why: '시각자원의 구조표준입니다. 내용규칙도 포함하지만 주된 특성은 구조입니다.' },
          { text: 'JSON-LD', cat: 'x', why: 'RDF 직렬화 포맷의 하나, 교환표준입니다.' },
          { text: 'LCNAF (이름 전거파일)', cat: 'v', why: '전거파일은 대표 표기를 정해 주는 값표준입니다.' },
          { text: 'CCO (Cataloging Cultural Objects)', cat: 'c', why: '박물관의 내용표준입니다.' },
          { text: 'MODS', cat: 's', why: '도서관 서지의 구조표준입니다.' },
        ],
        outro: '표준 하나가 여러 특성을 가질 수 있으므로 분류는 주된 특성을 따릅니다.',
      },
      {
        title: '2단계 · 규칙 문장 보고 유형 고르기',
        intro: '이번에는 표준 이름이 아니라 <b>규칙 문장</b>입니다. 『어린 왕자』 한 권을 목록하는 장면을 떠올리세요.',
        cats: [{ key: 's', label: '구조표준' }, { key: 'c', label: '내용표준' }, { key: 'v', label: '값표준' }, { key: 'x', label: '교환표준' }],
        items: [
          { text: '레코드에 표제·저자·발행년·언어 칸을 둔다', cat: 's', why: '어떤 칸을 둘지는 구조표준이 정합니다.' },
          { text: '표제에서 첫 관사를 생략한다', cat: 'c', why: '교재 표 1-7의 내용표준 규칙 예입니다.' },
          { text: '언어는 ISO 639-2 코드 kor로 적는다', cat: 'v', why: '정해진 코드 목록에서 고르게 하는 값표준입니다.' },
          { text: '레코드를 KORMARC 형식으로 저장해 다른 도서관과 주고받는다', cat: 'x', why: 'KORMARC는 교환표준입니다.' },
          { text: '저작권일보다 발행일을 기술한다', cat: 'c', why: '무엇을 어떻게 적을지 정한 내용표준 규칙입니다.' },
          { text: '주제는 주제명표목표에서 고른다', cat: 'v', why: '통제된 용어 목록에서 고르게 하는 값표준입니다.' },
          { text: '사람 이름은 성을 먼저 쓴다', cat: 'c', why: '적는 순서와 형식의 규칙, 내용표준입니다.' },
          { text: '저자명은 전거파일의 대표 표기로 적는다', cat: 'v', why: '전거파일은 값표준입니다. 내용표준이 형식을 맞추고 값표준이 대표 표기 하나로 묶어 줍니다.' },
        ],
        outro: '실제로는 목록자가 레코드 하나를 만들면서 네 유형을 동시에 적용합니다. 연습문제 4번은 도서관 표준을 이 틀로 분류하는 문제입니다.',
      },
    ],
  };

  const LAB5 = {
    rounds: [
      {
        title: '이용자 과업 다섯 가지',
        intro: '대학원생 A가 『어린 왕자』 한국어 번역본을 찾습니다(수업용). 각 장면이 LRM의 다섯 과업 가운데 무엇인지 고르세요.',
        cats: [{ key: 'find', label: '발견 find', tip: '찾아낸다' }, { key: 'id', label: '식별 identify', tip: '맞는지 확인' }, { key: 'sel', label: '선정 select', tip: '비교해 고른다' }, { key: 'obt', label: '획득 obtain', tip: '손에 넣는다' }, { key: 'exp', label: '탐험 explore', tip: '넓혀 본다' }],
        items: [
          { text: '‘어린 왕자’로 검색해 결과 목록을 얻는다', cat: 'find', why: '검색어로 관련 자료를 찾아내는 것이 발견입니다. 주로 표제·저자·주제어를 봅니다.' },
          { text: '결과 가운데 내가 찾던 작품의 번역본이 맞는지 저자·언어를 확인한다', cat: 'id', why: '그 자원이 맞는지 알아보는 것이 식별입니다.' },
          { text: '번역자와 출판사, 종이책인지 전자책인지 비교해 한 판을 고른다', cat: 'sel', why: '여러 판을 비교해 맞는 것을 고르는 것이 선정입니다.' },
          { text: '청구기호로 서가에서 책을 찾아 빌린다', cat: 'obt', why: '손에 넣는 것이 획득입니다. 청구기호·URL이 필요합니다.' },
          { text: '같은 작가의 다른 작품으로 관심을 넓혀 본다', cat: 'exp', why: '관련 저작으로 넓혀 가는 것이 탐험입니다.' },
          { text: '전자책 링크에 접속해 본문을 연다', cat: 'obt', why: '접속해 이용하는 것도 획득입니다.' },
          { text: '주제어 ‘동화’를 눌러 비슷한 책을 둘러본다', cat: 'exp', why: '주제로 넓혀 보는 탐험입니다.' },
          { text: 'ISBN을 보고 찾던 그 판이 맞는지 확인한다', cat: 'id', why: '식별자는 식별에 쓰입니다.' },
          { text: '두 출판사의 판 가운데 글씨가 큰 판을 고른다', cat: 'sel', why: '판의 특징을 비교해 고르는 선정입니다.' },
          { text: '저자명 ‘생텍쥐페리’로 검색해 관련 자료를 찾아낸다', cat: 'find', why: '저자로 찾아내는 것도 발견입니다.' },
        ],
        outro: '좋은 메타데이터는 다섯 단계를 모두 수월하게 해 줍니다. 우리 도서관 목록은 어느 단계가 약한지 생각해 보세요.',
      },
    ],
  };

  const LAB6 = {
    rounds: [
      {
        title: 'FAIR 가려내기',
        intro: '석사과정생이 설문 응답 데이터를 학교 리포지토리에 올립니다(가상). 각 행동이 FAIR의 어느 글자에 해당하는지 고르세요.',
        cats: [{ key: 'F', label: 'F 발견성', tip: '찾을 수 있게' }, { key: 'A', label: 'A 접근성', tip: '접근할 수 있게' }, { key: 'I', label: 'I 상호운용성', tip: '함께 쓸 수 있게' }, { key: 'R', label: 'R 재사용성', tip: '다시 쓸 수 있게' }],
        items: [
          { text: 'DOI처럼 바뀌지 않는 영구 식별자를 받는다', cat: 'F', why: 'F1 고유하고 영구한 식별자입니다.' },
          { text: '메타데이터 안에 데이터의 식별자를 분명히 적는다', cat: 'F', why: 'F3입니다. 메타데이터에서 데이터로 이어져야 찾을 수 있습니다.' },
          { text: '검색 사이트에 등록해 색인되게 한다', cat: 'F', why: 'F4 검색자원에 등록·색인입니다.' },
          { text: '누구나 쓰는 https 주소로 열람하게 한다', cat: 'A', why: 'A1 표준화된 공개 프로토콜로 접근합니다.' },
          { text: '개인 응답이 담긴 데이터는 승인 절차를 거쳐 열람하게 한다', cat: 'A', why: 'A1.2 필요하면 인증·승인 절차를 허용합니다. FAIR가 곧 무조건 공개는 아닙니다.' },
          { text: '데이터를 내려야 할 사정이 생겨도 설명 페이지는 남겨 둔다', cat: 'A', why: 'A2 데이터가 사라져도 메타데이터는 접근 가능해야 합니다.' },
          { text: '메타데이터를 RDF 같은 표준 형식으로 적는다', cat: 'I', why: 'I1 공식적이고 공유되는 지식표현 언어입니다.' },
          { text: '주제어를 통제어휘에서 고르고 언어는 ISO 639 코드로 적는다', cat: 'I', why: 'I2 FAIR 원칙을 따르는 어휘 사용입니다.' },
          { text: '이 데이터가 참고한 다른 데이터세트를 URI로 가리킨다', cat: 'I', why: 'I3 다른 메타데이터로의 구체적 참조입니다.' },
          { text: 'CC BY 4.0처럼 이용 조건을 명시한다', cat: 'R', why: 'R1.1 명확하고 접근 가능한 데이터 이용 라이선스입니다.' },
          { text: '누가·언제·어떤 도구로 수집·가공했는지 적는다', cat: 'R', why: 'R1.2 상세한 출처입니다.' },
          { text: '분야 커뮤니티의 메타데이터 표준을 따른다', cat: 'R', why: 'R1.3 도메인 관련 커뮤니티의 표준에 부합합니다.' },
        ],
        outro: 'A2는 5부 기능 ⑥ 처분(폐기 뒤에도 메타데이터는 남긴다)과 같은 생각입니다. 우리 도서관 디지털 컬렉션은 네 글자 가운데 무엇이 부족할지 생각해 보세요.',
      },
    ],
  };

  /* ---------- 실습 2: 레코드를 트리플로 ---------- */
  function triples(root) {
    const SUBJ = ['『어린 왕자』(자원)', '생텍쥐페리(자원)'];
    const PRED = ['표제', '저자', '발행년', '출생년'];
    const OBJ = ['“어린 왕자”(글자)', '생텍쥐페리(자원)', '“생텍쥐페리”(글자)', '1943', '1900'];
    const WANT = [
      { s: 0, p: 0, o: 0, read: '『어린 왕자』의 표제는 “어린 왕자”' },
      { s: 0, p: 1, o: 1, read: '『어린 왕자』의 저자는 생텍쥐페리(자원)' },
      { s: 0, p: 2, o: 3, read: '『어린 왕자』의 발행년은 1943' },
      { s: 1, p: 3, o: 4, read: '생텍쥐페리의 출생년은 1900' },
    ];
    const stage = h(`<div class="stage">
      <h3>레코드를 서술문(트리플)으로 풀기</h3>
      <p class="lab-intro">왼쪽은 『어린 왕자』에 관한 레코드 하나(수업용)입니다. 상자 하나에 네 줄이 모두 들어 있습니다. 이것을 <b>주어–술어–목적어</b> 트리플 네 개로 쪼개 보세요. 목적어에는 글자 값도, 다른 자원도 올 수 있습니다.</p>
      <div class="rec"><b>표제</b><span>어린 왕자</span><b>저자</b><span>생텍쥐페리</span><b>발행년</b><span>1943</span><b>저자 출생년</b><span>1900</span></div>
      <div id="trows"></div>
      <div class="btn-row"><button type="button" class="btn btn--sm" id="tcheck">검사</button><button type="button" class="btn btn--ghost btn--sm" id="treset">처음부터</button><span class="small muted">같은 사실이면 줄 순서는 달라도 됩니다.</span></div>
      <p class="say" id="tsay" aria-live="polite"></p>
      <div id="tnext"></div>
    </div>`);
    root.appendChild(stage);
    const rows = stage.querySelector('#trows');
    const sel = (opts, lbl) => `<div class="cell"><label class="lbl">${lbl}</label><select><option value="">고르세요</option>${opts.map((o, k) => `<option value="${k}">${esc(o)}</option>`).join('')}</select></div>`;
    for (let k = 0; k < 4; k++) rows.appendChild(h(`<div class="triple-row">${sel(SUBJ, '주어 (자원)')}${sel(PRED, '술어 (속성)')}${sel(OBJ, '목적어 (값 또는 자원)')}<p class="triple-msg"></p></div>`));
    const say = stage.querySelector('#tsay');
    stage.querySelector('#treset').addEventListener('click', () => { rows.querySelectorAll('select').forEach((s) => { s.value = ''; }); rows.querySelectorAll('.triple-msg').forEach((m) => { m.textContent = ''; m.className = 'triple-msg'; }); say.textContent = ''; say.className = 'say'; stage.querySelector('#tnext').innerHTML = ''; });
    stage.querySelector('#tcheck').addEventListener('click', () => {
      const used = new Set(); let okCount = 0;
      rows.querySelectorAll('.triple-row').forEach((row) => {
        const [s, p, o] = [...row.querySelectorAll('select')].map((x) => x.value);
        const msg = row.querySelector('.triple-msg');
        msg.className = 'triple-msg';
        if (s === '' || p === '' || o === '') { msg.textContent = '세 칸을 모두 고르세요.'; return; }
        const hit = WANT.findIndex((w, idx) => !used.has(idx) && w.s == s && w.p == p && w.o == o);
        if (hit >= 0) { used.add(hit); okCount++; msg.className = 'triple-msg ok'; msg.textContent = '맞습니다. ' + WANT[hit].read; return; }
        msg.className = 'triple-msg no';
        if (p == 1 && o == 2) msg.textContent = '저자를 글자 “생텍쥐페리”로 적으면 틀리지는 않지만, 이 실습에서는 다른 자원(생텍쥐페리)을 가리키세요. 그래야 넷째 트리플과 이어집니다.';
        else if (p == 3 && s == 0) msg.textContent = '출생년의 주어는 책이 아니라 사람입니다. 레코드의 ‘저자 출생년’은 저자라는 다른 자원의 속성입니다.';
        else if (p == 0 && o == 1) msg.textContent = '표제의 값은 글자 “어린 왕자”입니다. 자원 『어린 왕자』 자신이 아닙니다.';
        else msg.textContent = '레코드의 어느 줄에도 없는 사실입니다. 레코드를 다시 보세요.';
      });
      if (okCount === 4) {
        say.className = 'say ok'; say.textContent = '네 트리플이 모두 맞습니다.';
        stage.querySelector('#tnext').innerHTML = `
          <h3 class="sub" style="margin-top:1rem">읽어 보기</h3>
          <ul class="read-list">
            <li><b>기술 1</b> 『어린 왕자』에 대한 서술문 셋(표제·저자·발행년)</li>
            <li><b>기술 2</b> 생텍쥐페리에 대한 서술문 하나(출생년)</li>
            <li><b>기술세트</b> 둘째 트리플의 목적어가 넷째 트리플의 주어와 같은 자원이라 두 기술이 이어진다</li>
          </ul>
          <div class="q" data-why="맞습니다. 생텍쥐페리의 출생년 같은 정보는 자원 ‘생텍쥐페리’에 한 번만 적고, 다른 책은 그 자원을 가리키기만 하면 됩니다. 레코드 방식이라면 책마다 저자 출생년을 되풀이해 적어야 합니다.">
            <p class="ask">생텍쥐페리의 다른 책 『야간 비행』 레코드를 만든다면, 저자 출생년 1900은 어떻게 되나요?</p>
            <div class="opts"><button data-no="그렇게 하면 레코드 방식의 반복 기술로 돌아갑니다.">『야간 비행』에도 다시 적는다</button><button data-ok>자원 ‘생텍쥐페리’를 가리키기만 하면 된다</button></div>
            <p class="say" aria-live="polite"></p>
          </div>`;
        bindQ(stage.querySelector('#tnext'));
      } else { say.className = 'say'; say.textContent = `맞은 트리플 ${okCount}/4. 빨간 설명을 보고 고쳐 보세요.`; }
    });
  }

  /* ---------- 실습 7: 개념모델 그리기 ---------- */
  function erModel(root) {
    const stage = h(`<div class="stage">
      <h3>개념모델 그리기 (연습문제 5번 준비)</h3>
      <p class="lab-intro">가상 사례 하나를 정하고 <b>개체 → 속성 → 관계</b> 순서로 적으면 그림이 그려집니다. 처음에는 작은도서관 그림책 대출 예(수업용·가상)가 들어 있으니 지우고 내 사례로 바꿔 보세요. 개체 이름 한 줄, 속성은 한 줄에 하나씩 적습니다.</p>
      <div class="er-grid">
        ${[['회원', '회원번호\n이름\n학년'], ['그림책', '표제\n발행년\n대상 연령'], ['작가', '이름\n국적']].map((e, k) => `
        <div class="er-box"><label class="lbl">개체 ${k + 1}</label><input type="text" class="ename" value="${esc(e[0])}" maxlength="14">
          <label class="lbl" style="margin-top:.4rem">속성 (한 줄에 하나)</label><textarea class="eattr" rows="4">${esc(e[1])}</textarea></div>`).join('')}
      </div>
      <label class="lbl" style="margin-top:.9rem">관계 (어느 개체가 어느 개체와, 어떤 이름으로)</label>
      <div id="rels"></div>
      <div class="btn-row"><button type="button" class="btn btn--sm" id="erdraw">그리기</button><button type="button" class="btn btn--ghost btn--sm" id="ercopy">글로 정리</button></div>
      <div id="er-wrap"></div>
      <ul class="checks" id="erchecks" style="margin-top:.8rem">
        <li data-k="names">개체 세 개에 이름이 있다</li>
        <li data-k="attrs">개체마다 속성이 둘 이상이다</li>
        <li data-k="rels">관계 둘에 이름이 있다</li>
        <li data-k="diff">관계의 양 끝이 서로 다른 개체다</li>
        <li data-k="author">사람(작가 등)을 다른 개체의 속성으로 적지 않고 따로 개체로 세웠다 — 10번 슬라이드의 베토벤과 같은 원리 (스스로 확인)</li>
      </ul>
      <textarea id="ertext" rows="7" style="margin-top:.8rem; display:none" readonly></textarea>
    </div>`);
    root.appendChild(stage);
    const rels = stage.querySelector('#rels');
    const relRow = (a, name, b) => {
      const row = h(`<div class="rel-row"><select class="ra"></select><input type="text" class="rn" value="${esc(name)}" placeholder="관계 이름 (예: 빌린다)" maxlength="12"><select class="rb"></select></div>`);
      rels.appendChild(row); row.dataset.a = a; row.dataset.b = b;
    };
    relRow(0, '빌린다', 1); relRow(2, '짓는다', 1);
    const names = () => [...stage.querySelectorAll('.ename')].map((x) => x.value.trim());
    const fillSelects = () => {
      const n = names();
      rels.querySelectorAll('.rel-row').forEach((row) => {
        ['ra', 'rb'].forEach((cls, idx) => {
          const s = row.querySelector('.' + cls); const cur = s.value !== '' ? s.value : row.dataset[idx ? 'b' : 'a'];
          s.innerHTML = n.map((v, k) => `<option value="${k}">${esc(v || '개체 ' + (k + 1))}</option>`).join('');
          s.value = cur;
        });
      });
    };
    fillSelects();
    stage.querySelectorAll('.ename').forEach((x) => x.addEventListener('input', fillSelects));
    const model = () => ({
      ents: [...stage.querySelectorAll('.er-box')].map((b) => ({ name: b.querySelector('.ename').value.trim(), attrs: b.querySelector('.eattr').value.split('\n').map((s) => s.trim()).filter(Boolean) })),
      rels: [...rels.querySelectorAll('.rel-row')].map((r) => ({ a: +r.querySelector('.ra').value, name: r.querySelector('.rn').value.trim(), b: +r.querySelector('.rb').value })),
    });
    const draw = () => {
      const m = model();
      const pos = [[130, 90], [510, 90], [320, 270]];
      const W = 160, H = (e) => 34 + 16 * Math.max(e.attrs.length, 1);
      let svg = `<svg class="graph" viewBox="0 0 640 380" role="img" aria-label="개체-관계 그림">`;
      m.rels.forEach((r) => {
        if (r.a === r.b) return;
        const [ax, ay] = pos[r.a], [bx, by] = pos[r.b];
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L;
        const ha = H(m.ents[r.a]) / 2, hb = H(m.ents[r.b]) / 2;
        const tA = Math.min(W / 2 / Math.abs(ux || 1e-9), ha / Math.abs(uy || 1e-9));
        const tB = Math.min(W / 2 / Math.abs(ux || 1e-9), hb / Math.abs(uy || 1e-9));
        const x1 = ax + ux * tA, y1 = ay + uy * tA, x2 = bx - ux * (tB + 8), y2 = by - uy * (tB + 8);
        svg += `<line class="edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
        const px = x2 + ux * 8, py = y2 + uy * 8;
        svg += `<polygon class="arrow" points="${px},${py} ${x2 - uy * 5},${y2 + ux * 5} ${x2 + uy * 5},${y2 - ux * 5}"/>`;
        svg += `<text class="edge-label" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle">${esc(r.name || '(관계 이름)')}</text>`;
      });
      m.ents.forEach((e, k) => {
        const [cx, cy] = pos[k], hh = H(e);
        svg += `<rect class="ent" x="${cx - W / 2}" y="${cy - hh / 2}" width="${W}" height="${hh}" rx="8"/>`;
        svg += `<text class="ent-label" x="${cx}" y="${cy - hh / 2 + 20}" text-anchor="middle">${esc(e.name || '개체 ' + (k + 1))}</text>`;
        e.attrs.forEach((a, j) => { svg += `<text class="attr" x="${cx - W / 2 + 12}" y="${cy - hh / 2 + 40 + 16 * j}">· ${esc(a)}</text>`; });
      });
      svg += '</svg>';
      stage.querySelector('#er-wrap').innerHTML = svg;
      const ok = {
        names: m.ents.every((e) => e.name),
        attrs: m.ents.every((e) => e.attrs.length >= 2),
        rels: m.rels.every((r) => r.name),
        diff: m.rels.every((r) => r.a !== r.b),
      };
      stage.querySelectorAll('#erchecks li').forEach((li) => { if (li.dataset.k in ok) li.classList.toggle('done', ok[li.dataset.k]); });
      return m;
    };
    stage.querySelector('#erdraw').addEventListener('click', draw);
    stage.querySelector('#ercopy').addEventListener('click', () => {
      const m = draw();
      const t = stage.querySelector('#ertext');
      t.style.display = 'block';
      t.value = '개념모델 (개체 / 속성 / 관계)\n' + m.ents.map((e) => `- 개체 ${e.name}: ${e.attrs.join(', ')}`).join('\n') + '\n' + m.rels.map((r) => `- 관계: ${m.ents[r.a].name} —${r.name}→ ${m.ents[r.b].name}`).join('\n');
      t.focus(); t.select();
    });
    draw();
  }

  /* ---------- 확인 문제(.q) 공통 ---------- */
  function bindQ(scope) {
    scope.querySelectorAll('.q').forEach((q) => {
      const say = q.querySelector('.say');
      q.querySelectorAll('.opts button').forEach((b) => {
        b.type = 'button';
        b.addEventListener('click', () => {
          if (b.dataset.ok !== undefined) { b.classList.add('right'); q.querySelectorAll('.opts button').forEach((o) => { o.disabled = true; }); say.textContent = q.dataset.why || '맞습니다.'; }
          else { b.classList.add('wrong'); b.disabled = true; say.textContent = b.dataset.no || '다시 생각해 보세요.'; }
        });
      });
    });
  }

  /* ---------- 차례와 화면 전환 ---------- */
  const LABS = [
    { id: '1', title: '실습 1 · 데이터인가 메타데이터인가', part: '1부', run: (r) => classify(r, LAB1) },
    { id: '2', title: '실습 2 · 레코드를 트리플로', part: '2부', run: triples },
    { id: '3', title: '실습 3 · 유형 가려내기', part: '5부', run: (r) => classify(r, LAB3) },
    { id: '4', title: '실습 4 · 표준 네 유형', part: '6부', run: (r) => classify(r, LAB4) },
    { id: '5', title: '실습 5 · 이용자 과업', part: '7부', run: (r) => classify(r, LAB5) },
    { id: '6', title: '실습 6 · FAIR 가려내기', part: '8부', run: (r) => classify(r, LAB6) },
    { id: '7', title: '실습 7 · 개념모델 그리기', part: '7부·연습문제 5', run: erModel },
  ];
  const base = 'materials/metadata-2026-2/overview/lab.html';
  LABS.forEach((l) => { tabs.appendChild(h(`<li><a href="${base}#${l.id}" data-id="${l.id}">${esc(l.title)}</a></li>`)); });
  function render() {
    const id = (location.hash || '#1').slice(1);
    const lab = LABS.find((l) => l.id === id) || LABS[0];
    tabs.querySelectorAll('a').forEach((a) => { if (a.dataset.id === lab.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    app.innerHTML = '';
    app.appendChild(h(`<p class="small muted" style="margin:0 0 .4rem">이론 ${esc(lab.part)}과 이어집니다. <a href="materials/metadata-2026-2/overview/theory.html">이론 다시 보기</a></p>`));
    lab.run(app);
    const k = LABS.indexOf(lab);
    const nav = h('<div class="btn-row" style="margin-top:1.2rem"></div>');
    if (k > 0) nav.appendChild(h(`<a class="btn btn--ghost btn--sm" href="${base}#${LABS[k - 1].id}">← ${esc(LABS[k - 1].title)}</a>`));
    if (k + 1 < LABS.length) nav.appendChild(h(`<a class="btn btn--sm" href="${base}#${LABS[k + 1].id}">${esc(LABS[k + 1].title)} →</a>`));
    else nav.appendChild(h('<a class="btn btn--sm" href="materials/metadata-2026-2/vocabulary/">다음: 교재 2장 메타데이터 어휘 →</a>'));
    app.appendChild(nav);
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', render);
  render();
})();
