/* 메타데이터 개요 페이지 공통: 확인 문제. 서버·가입 없음, 고른 답을 어디에도 저장하지 않는다 */
(() => {
  document.querySelectorAll('.q').forEach((q) => {
    const say = q.querySelector('.say');
    q.querySelectorAll('.opts button').forEach((b) => {
      b.type = 'button';
      b.addEventListener('click', () => {
        if (b.dataset.ok !== undefined) {
          b.classList.add('right');
          q.querySelectorAll('.opts button').forEach((o) => { o.disabled = true; });
          say.textContent = q.dataset.why || '맞습니다.';
        } else {
          b.classList.add('wrong');
          b.disabled = true;
          say.textContent = b.dataset.no || '다시 생각해 보세요.';
        }
      });
    });
  });
})();
