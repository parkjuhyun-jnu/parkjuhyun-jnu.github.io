서버·클라이언트 실습 묶음 (class-lab)
전남대학교 문헌정보학과 · 메타데이터와아카이빙연구 · 2026학년도 2학기

[폴더 구성]  서버에서는 /srv/class-lab 에 둡니다.
  www/                 ← 웹 루트. 이 폴더 안의 파일만 주소로 열 수 있습니다.
    index.html         처음 화면 (세 단계로 가는 길)
    style.css          모든 화면의 모양
    step1/index.html   1단계: HTML 한 장 (‘오늘의 한 문장’을 바꿔 다시 올리는 시연)
    step2/index.html   2단계: 목록을 통째로 받아 브라우저가 찾기
    step2/search.js       └ 브라우저에서 돌아가는 찾기 프로그램
    step2/books.csv       └ (시연 때 올림) data/books.csv 를 여기로 복사
    step3/index.php    3단계: 서버(PHP)가 데이터베이스에 SQL로 물어 찾기
    step3/api.php         └ 같은 검색을 JSON으로 돌려주는 API
    step3/db.php          └ 데이터베이스를 여는 공통 코드
  data/                ← 웹 루트 바깥. 주소로는 열 수 없습니다.
    권장도서_초등.xlsx  원본 엑셀 (어린이도서연구회 추천 목록 서지 사항)
    books.csv          엑셀을 ‘CSV UTF-8’로 저장한 것
    load.sql           books.csv 를 books.db 의 book 테이블에 넣는 SQL
    books.db           (시연 때 생김) 데이터베이스 파일
  setup/
    check.sh           서버 상태 점검 (읽기만 함)
    install.sh         실습용 웹 서버 설치 (한 번만, 기본 8080번 문)
    demo-reset.sh      수업 직전: 2·3단계를 ‘아직 없음’으로 되돌리기
    demo-ready.sh      2·3단계를 한 번에 준비하기 (시연을 건너뛸 때, 수업 뒤)
    uninstall.sh       학기 끝: 실습 서버 끄기 (--files 를 붙이면 폴더도 지움)

[처음 설치]  가비아 콘솔 → 서버 → [서버 접속] 창에서
  sudo apt-get install -y unzip
  cd /tmp && curl -fsSLo class-lab.zip https://parkjuhyun-jnu.github.io/materials/metadata-2026-2/server-client/class-lab.zip
  unzip -o class-lab.zip && sudo bash class-lab/setup/install.sh
  → 가비아 콘솔 방화벽에서 TCP 8080 을 엽니다. 폰에서 http://공인IP:8080/
  → 우리 수업 서버(refstd): http://1.201.120.29:8080/

[3단계 시연: 목록을 데이터베이스에 넣기]
  cd /srv/class-lab/data
  sudo sqlite3 books.db < load.sql

[목록 출처]
  (사)어린이도서연구회 ‘추천 목록’ https://www.childbook.org/book/recommend_list.html
  가운데 연령이 7세부터·9세부터·11세부터인 책의 서지 사항(책이름·지은이·출판사·펴낸해·쪽수·연령·갈래).
  연구회가 쓴 소개글과 표지 그림은 싣지 않았습니다. 각 책의 연구회링크에서 보세요.

자세한 안내: https://parkjuhyun-jnu.github.io/materials/metadata-2026-2/server-client/
