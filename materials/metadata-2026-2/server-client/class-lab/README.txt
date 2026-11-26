서버와 클라이언트 실습 묶음 (class-lab)
전남대학교 문헌정보학과, 메타데이터와아카이빙연구, 2026학년도 2학기

[폴더 구성]  서버에서는 /srv/class-lab 에 둡니다.
  www/                 ← 웹 루트. 이 폴더 안의 파일만 주소로 열 수 있습니다.
    index.html         처음 화면 (세 단계와 학생 실습실로 가는 길)
    style.css          모든 화면의 모양
    step1/index.html   1단계: HTML 한 장 (‘오늘의 한 문장’을 바꿔 다시 올리는 시연)
    step2/index.html   2단계: 목록을 통째로 받아 브라우저가 찾기
    step2/search.js       └ 브라우저에서 돌아가는 찾기 프로그램
    step2/books.csv       └ (시연 때 올림) data/books.csv 를 여기로 복사
    step3/index.php    3단계: 서버(PHP)가 데이터베이스에 SQL로 물어 찾기
    step3/api.php         └ 같은 검색을 JSON으로 돌려주는 API
    step3/db.php          └ 데이터베이스를 여는 공통 코드
    router.php         길잡이: /u/아이디/ 주소를 학생 홈페이지 폴더로 잇습니다
    lab/               학생 실습실 (학생이 직접 하는 실습, 서버 계정 없이 브라우저로)
      index.php           들어가기(수업 코드, 아이디, 네 자리 비밀번호)와 진도
      home.php            A 내 홈페이지: 파일 만들기, 고치기, 올리기, 방문 기록, 응답 머리
      sql.php, api.php    B SQL 실습실: 목록 DB 묻기, 정규화, 함께 쓰는 DB, 내 DB (29문제, 자동 채점)
      archive.php         C 우리 반 아카이브: 올리기(내 컴퓨터와 서버가 SHA-256을 따로 잼), 목록
      item.php            C 자료 하나: 더블린 코어, 기술 메타데이터, 보존 기록, 고정성 검사, 내보내기(XML, JSON, BagIt)
      file.php            이용본과 원본 내보내기(로그인 확인, 폰 영상용 Range 지원)
      teacher.php         교수 화면: 진도, 비밀번호 초기화, 학생 지우기, 열고 닫기, CSV 내려받기
  lib/                 ← 웹 루트 바깥. 학생 실습실 프로그램
    app.php            설정, 로그인, 실습실 DB, 한도(맨 위 숫자)
    sites.php          학생 홈페이지 내보내기 (PHP는 실행하지 않고 글자로)
    sqlrun.php, sqlworker.php   SQL을 따로 된 프로그램에서 5초 안에 실행, DB마다 권한
    exercises.php      B 문제와 채점 기준
    archive.php, archive-job.php   C 받기, 체크섬, 형식 식별, 사본, exiftool과 ffprobe, ffmpeg 이용본
  data/                ← 웹 루트 바깥. 주소로는 열 수 없습니다.
    권장도서_초등.xlsx  원본 엑셀 (어린이도서연구회 추천 목록 서지 사항)
    books.csv          엑셀을 ‘CSV UTF-8’로 저장한 것
    load.sql           books.csv 를 books.db 의 book 테이블에 넣는 SQL
    books.db           (시연 때 생김) 데이터베이스 파일
    person.csv, credit.csv, role.csv   지은이 칸을 사람과 역할로 나눈 표 (B2 정규화 실습)
  samples/             C 아카이빙 보기 파일 (수업용으로 만든 사진, 녹음. 일부러 문제 있는 파일 포함)
  setup/
    check.sh           서버 상태 점검 (읽기만 함)
    install.sh         실습용 웹 서버 설치 (다시 실행해도 됨, 기본 8080번 문)
    lab-init.php       학생 실습실 준비 (install.sh가 부름. --codes 로 입장 코드와 교수 코드 새로 만들기)
    demo-reset.sh      수업 직전: 2, 3단계를 ‘아직 없음’으로 되돌리기
    demo-ready.sh      2, 3단계를 한 번에 준비하기 (시연을 건너뛸 때, 수업 뒤)
    uninstall.sh       학기 끝: 실습 서버 끄기 (--files 를 붙이면 폴더와 학생 자료도 지움)
  tools/               내 컴퓨터에서 쓴 준비 도구 (지은이 나누기, 보기 파일 만들기, 이 묶음 만들기)
  var/                 (서버에서 생김) 학생 자료. www-data 소유, 다시 설치해도 지우지 않음

[처음 설치, 또는 새 파일로 바꾸기]  가비아 콘솔 → 서버 → [서버 접속] 창에서
  sudo apt-get install -y unzip
  cd /tmp && curl -fsSLo class-lab.zip https://parkjuhyun-jnu.github.io/materials/metadata-2026-2/server-client/class-lab.zip
  unzip -o class-lab.zip && sudo bash class-lab/setup/install.sh
  → 끝에 학생 입장 코드와 교수 코드가 나옵니다. 가비아 콘솔 방화벽에서 TCP 8080 을 엽니다.
  → 시연: http://공인IP:8080/      학생 실습실: http://공인IP:8080/lab/
  → 우리 수업 서버(refstd) 공인 IP는 1.201.120.29 입니다.
     시연: http://1.201.120.29:8080/      학생 실습실: http://1.201.120.29:8080/lab/

[3단계 시연: 목록을 데이터베이스에 넣기]
  cd /srv/class-lab/data
  sudo sqlite3 books.db < load.sql

[목록 출처]
  (사)어린이도서연구회 ‘추천 목록’ https://www.childbook.org/book/recommend_list.html
  가운데 연령이 7세부터, 9세부터, 11세부터인 책의 서지 사항(책이름, 지은이, 출판사, 펴낸해, 쪽수, 연령, 갈래).
  연구회가 쓴 소개글과 표지 그림은 싣지 않았습니다. 각 책의 연구회링크에서 보세요.

자세한 안내
  시연:        https://parkjuhyun-jnu.github.io/materials/metadata-2026-2/server-client/
  학생 실습실: https://parkjuhyun-jnu.github.io/materials/metadata-2026-2/server-client/lab.html
  교수용 준비: https://parkjuhyun-jnu.github.io/materials/metadata-2026-2/server-client/checklist.html
