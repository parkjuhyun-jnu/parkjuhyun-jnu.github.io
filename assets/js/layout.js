/* ==========================================================================
   공통 꼬리말(푸터) — 모든 페이지에 같은 내용을 넣기 위해 한 곳에서 관리합니다.
   페이지에는 <div id="site-footer"></div> 만 두면 됩니다.
   ========================================================================== */
(function () {
  const slot = document.getElementById('site-footer');
  if (!slot) return;

  slot.outerHTML = `
<footer class="site-footer">
  <div class="wrap">
    <div class="site-footer__grid">
      <div>
        <h4>박주현</h4>
        <p class="small mb-0">전남대학교 사회과학대학<br>문헌정보학과 부교수</p>
      </div>
      <div>
        <h4>연락</h4>
        <ul class="small">
          <li><a href="mailto:park51566@jnu.ac.kr">park51566@jnu.ac.kr</a></li>
          <li><a href="tel:0625302662">062-530-2662</a></li>
          <li>사회과학대학 355호</li>
          <li>광주광역시 북구 용봉로 77</li>
        </ul>
      </div>
      <div>
        <h4>바로가기</h4>
        <ul class="small">
          <li><a href="about.html">소개</a></li>
          <li><a href="research.html">연구</a></li>
          <li><a href="courses.html">수업</a></li>
          <li><a href="media.html">미디어·강연</a></li>
          <li><a href="gallery.html">결과물 갤러리</a></li>
          <li><a href="surveys.html">설문</a></li>
        </ul>
      </div>
      <div>
        <h4>외부 링크</h4>
        <ul class="small">
          <li><a href="https://list.jnu.ac.kr/" target="_blank" rel="noopener">전남대 문헌정보학과</a></li>
          <li><a href="https://scholar.google.com/citations?user=GnkejtMAAAAJ" target="_blank" rel="noopener">Google Scholar</a></li>
          <li><a href="https://www.kci.go.kr/" target="_blank" rel="noopener">KCI 한국학술지인용색인</a></li>
          <li><a href="en.html" lang="en">English</a></li>
          <li><a href="admin.html">관리자</a></li>
        </ul>
      </div>
    </div>
    <div class="site-footer__bottom">
      <span>&copy; <span data-year>2026</span> 박주현. All rights reserved.<span id="last-updated"></span></span>
      <span>학생 결과물의 저작권은 각 학생에게 있습니다.</span>
    </div>
  </div>
</footer>`;

  // 마지막 갱신일: 저장소의 가장 최근 커밋 날짜를 GitHub 에서 읽어 옵니다.
  // 한 번 읽으면 이 탭에서는 다시 묻지 않습니다(요청 횟수 제한 때문).
  (async function lastUpdated() {
    const el = document.getElementById('last-updated');
    if (!el) return;
    let date = '';
    try { date = sessionStorage.getItem('lastUpdated') || ''; } catch { /* 저장소를 못 써도 괜찮습니다 */ }
    if (!date) {
      try {
        const r = await fetch('https://api.github.com/repos/parkjuhyun-jnu/parkjuhyun-jnu.github.io/commits?sha=main&per_page=1');
        if (!r.ok) return;
        const [c] = await r.json();
        date = (c && c.commit && c.commit.committer && c.commit.committer.date) || '';
        try { sessionStorage.setItem('lastUpdated', date); } catch { /* 무시 */ }
      } catch { return; }
    }
    if (!date) return;
    const d = new Date(date);
    el.textContent = ` · 마지막 갱신 ${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  })();

  // common.js 의 연도 채우기가 이미 끝났을 수 있으므로 여기서도 한 번 채웁니다.
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
