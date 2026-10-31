-- 작은 도서관 예제 DB (메타데이터론 3강 DB와 SQL 실습용)
-- 이용자·대출 자료는 모두 가상입니다. 서지 사항은 실제 책을 참고했지만 실습용으로 단순화했습니다.
PRAGMA foreign_keys = ON;

-- 출판사
CREATE TABLE publisher (
  publisher_id INTEGER PRIMARY KEY,      -- 출판사 번호
  name         TEXT NOT NULL UNIQUE,     -- 출판사 이름
  city         TEXT                      -- 소재지
);

-- KDC(한국십진분류법) 분류
CREATE TABLE kdc (
  code       TEXT PRIMARY KEY,           -- 분류 기호 (예: 813)
  name       TEXT NOT NULL,              -- 분류명 (예: 한국 소설)
  main_class TEXT NOT NULL               -- 주류 (예: 800 문학)
);

-- 도서 (서지 레코드 하나 = 판 하나, LRM의 구현형에 가깝다)
CREATE TABLE book (
  book_id      INTEGER PRIMARY KEY,      -- 도서 번호
  title        TEXT NOT NULL,            -- 서명
  publisher_id INTEGER REFERENCES publisher(publisher_id),
  pub_year     INTEGER,                  -- 출판 연도
  kdc_code     TEXT REFERENCES kdc(code),
  pages        INTEGER,                  -- 쪽수 (모르면 NULL)
  language     TEXT NOT NULL DEFAULT 'kor'  -- 본문 언어 (ISO 639-2)
);

-- 저자·역자 (사람 한 명 = 한 행)
CREATE TABLE author (
  author_id     INTEGER PRIMARY KEY,     -- 저자 번호
  name          TEXT NOT NULL,           -- 이름 (한글 표기)
  name_original TEXT,                    -- 원어 이름
  nationality   TEXT,                    -- 국적
  birth_year    INTEGER                  -- 태어난 해 (모르면 NULL)
);

-- 도서와 저자를 잇는 표 (한 책에 여러 사람, 한 사람이 여러 책 = 다대다)
CREATE TABLE book_author (
  book_id   INTEGER REFERENCES book(book_id),
  author_id INTEGER REFERENCES author(author_id),
  role      TEXT NOT NULL,               -- 지은이 / 옮긴이
  seq       INTEGER NOT NULL DEFAULT 1,  -- 표시 순서
  PRIMARY KEY (book_id, author_id, role)
);

-- 소장 자료 (실제 책 한 권 = 한 행, LRM의 개별자료)
CREATE TABLE item (
  item_id  TEXT PRIMARY KEY,             -- 등록번호 (예: EM000123)
  book_id  INTEGER NOT NULL REFERENCES book(book_id),
  location TEXT NOT NULL,                -- 자료실
  status   TEXT NOT NULL                 -- 대출가능 / 대출중 / 분실
);

-- 이용자 (모두 가상 인물)
CREATE TABLE member (
  member_id   INTEGER PRIMARY KEY,       -- 이용자 번호
  name        TEXT NOT NULL,             -- 이름 (가상)
  member_type TEXT NOT NULL,             -- 학부생 / 대학원생 / 교원 / 일반
  dept        TEXT,                      -- 소속
  joined_on   TEXT NOT NULL              -- 가입일 (YYYY-MM-DD)
);

-- 대출 기록
CREATE TABLE loan (
  loan_id     INTEGER PRIMARY KEY,       -- 대출 번호
  item_id     TEXT NOT NULL REFERENCES item(item_id),
  member_id   INTEGER NOT NULL REFERENCES member(member_id),
  loan_date   TEXT NOT NULL,             -- 대출일
  due_date    TEXT NOT NULL,             -- 반납 예정일 (대출일 + 14일)
  return_date TEXT                       -- 반납일 (아직 안 냈으면 NULL)
);

-- 예약
CREATE TABLE reservation (
  reservation_id INTEGER PRIMARY KEY,
  book_id        INTEGER NOT NULL REFERENCES book(book_id),
  member_id      INTEGER NOT NULL REFERENCES member(member_id),
  reserved_on    TEXT NOT NULL,
  status         TEXT NOT NULL           -- 대기 / 완료 / 취소
);


-- 자료 --------------------------------------------------


-- publisher (20행)
INSERT INTO publisher VALUES (1, '창비', '파주');
INSERT INTO publisher VALUES (2, '문학동네', '파주');
INSERT INTO publisher VALUES (3, '민음사', '서울');
INSERT INTO publisher VALUES (4, '김영사', '파주');
INSERT INTO publisher VALUES (5, '나무옆의자', NULL);
INSERT INTO publisher VALUES (6, '팩토리나인', NULL);
INSERT INTO publisher VALUES (7, '이성과힘', NULL);
INSERT INTO publisher VALUES (8, '열린책들', '파주');
INSERT INTO publisher VALUES (9, '문학수첩', '파주');
INSERT INTO publisher VALUES (10, '문학사상', NULL);
INSERT INTO publisher VALUES (11, '와이즈베리', NULL);
INSERT INTO publisher VALUES (12, '사이언스북스', '서울');
INSERT INTO publisher VALUES (13, '을유문화사', '서울');
INSERT INTO publisher VALUES (14, '에코리브르', NULL);
INSERT INTO publisher VALUES (15, '인플루엔셜', '서울');
INSERT INTO publisher VALUES (16, '북하우스', '서울');
INSERT INTO publisher VALUES (17, '자음과모음', '파주');
INSERT INTO publisher VALUES (18, '비즈니스북스', '서울');
INSERT INTO publisher VALUES (19, '쓰다', NULL);
INSERT INTO publisher VALUES (20, 'Harcourt', 'San Diego');

-- kdc (17행)
INSERT INTO kdc VALUES ('029', '독서·독서법', '000 총류');
INSERT INTO kdc VALUES ('189', '응용 심리학', '100 철학');
INSERT INTO kdc VALUES ('190', '윤리학', '100 철학');
INSERT INTO kdc VALUES ('325', '경영', '300 사회과학');
INSERT INTO kdc VALUES ('331', '사회학', '300 사회과학');
INSERT INTO kdc VALUES ('440', '천문학', '400 자연과학');
INSERT INTO kdc VALUES ('472', '생명과학', '400 자연과학');
INSERT INTO kdc VALUES ('539', '환경공학', '500 기술과학');
INSERT INTO kdc VALUES ('813', '한국 소설', '800 문학');
INSERT INTO kdc VALUES ('814', '한국 수필', '800 문학');
INSERT INTO kdc VALUES ('823', '중국 소설', '800 문학');
INSERT INTO kdc VALUES ('843', '영미 소설', '800 문학');
INSERT INTO kdc VALUES ('853', '독일 소설', '800 문학');
INSERT INTO kdc VALUES ('863', '프랑스 소설', '800 문학');
INSERT INTO kdc VALUES ('873', '스페인·포르투갈 소설', '800 문학');
INSERT INTO kdc VALUES ('909', '세계사', '900 역사');
INSERT INTO kdc VALUES ('981', '한국 지리·기행', '900 역사');

-- book (31행)
INSERT INTO book VALUES (1, '채식주의자', 1, 2007, '813', 247, 'kor');
INSERT INTO book VALUES (2, '소년이 온다', 1, 2014, '813', 216, 'kor');
INSERT INTO book VALUES (3, '작별하지 않는다', 2, 2021, '813', 332, 'kor');
INSERT INTO book VALUES (4, '82년생 김지영', 3, 2016, '813', 192, 'kor');
INSERT INTO book VALUES (5, '아몬드', 1, 2017, '813', 264, 'kor');
INSERT INTO book VALUES (6, '불편한 편의점', 5, 2021, '813', 268, 'kor');
INSERT INTO book VALUES (7, '달러구트 꿈 백화점', 6, 2020, '813', 300, 'kor');
INSERT INTO book VALUES (8, '난장이가 쏘아올린 작은 공', 7, 2000, '813', NULL, 'kor');
INSERT INTO book VALUES (9, '어린 왕자', 2, 2007, '863', 160, 'kor');
INSERT INTO book VALUES (10, '어린 왕자', 8, 2015, '863', 152, 'kor');
INSERT INTO book VALUES (11, '데미안', 3, 2000, '853', 230, 'kor');
INSERT INTO book VALUES (12, '1984', 3, 2003, '843', 460, 'kor');
INSERT INTO book VALUES (13, '해리 포터와 마법사의 돌', 9, 1999, '843', NULL, 'kor');
INSERT INTO book VALUES (14, '사피엔스', 4, 2015, '909', 636, 'kor');
INSERT INTO book VALUES (15, '호모 데우스', 4, 2017, '909', 624, 'kor');
INSERT INTO book VALUES (16, '총, 균, 쇠', 10, 1998, '909', 750, 'kor');
INSERT INTO book VALUES (17, '정의란 무엇인가', 4, 2010, '190', 404, 'kor');
INSERT INTO book VALUES (18, '공정하다는 착각', 11, 2020, '331', 420, 'kor');
INSERT INTO book VALUES (19, '코스모스', 12, 2006, '440', 720, 'kor');
INSERT INTO book VALUES (20, '이기적 유전자', 13, 2018, '472', 632, 'kor');
INSERT INTO book VALUES (21, '침묵의 봄', 14, 2011, '539', 400, 'kor');
INSERT INTO book VALUES (22, '미움받을 용기', 15, 2014, '189', 336, 'kor');
INSERT INTO book VALUES (23, '책은 도끼다', 16, 2011, '029', 348, 'kor');
INSERT INTO book VALUES (24, '나의 문화유산답사기 1', 1, 1993, '981', NULL, 'kor');
INSERT INTO book VALUES (25, '파친코 1', 15, 2022, '843', 444, 'kor');
INSERT INTO book VALUES (26, '삼체', 17, 2020, '823', 476, 'kor');
INSERT INTO book VALUES (27, '연금술사', 2, 2001, '873', 278, 'kor');
INSERT INTO book VALUES (28, '노인과 바다', 3, 2012, '843', 152, 'kor');
INSERT INTO book VALUES (29, '모순', 19, 2013, '813', 308, 'kor');
INSERT INTO book VALUES (30, '아주 작은 습관의 힘', 18, 2019, '325', 360, 'kor');
INSERT INTO book VALUES (31, 'The Little Prince', 20, 2000, '863', 83, 'eng');

-- author (47행)
INSERT INTO author VALUES (1, '한강', NULL, '한국', 1970);
INSERT INTO author VALUES (2, '조남주', NULL, '한국', 1978);
INSERT INTO author VALUES (3, '손원평', NULL, '한국', 1979);
INSERT INTO author VALUES (4, '김호연', NULL, '한국', 1974);
INSERT INTO author VALUES (5, '이미예', NULL, '한국', 1990);
INSERT INTO author VALUES (6, '조세희', NULL, '한국', 1942);
INSERT INTO author VALUES (7, '앙투안 드 생텍쥐페리', 'Antoine de Saint-Exupéry', '프랑스', 1900);
INSERT INTO author VALUES (8, '김화영', NULL, '한국', 1941);
INSERT INTO author VALUES (9, '황현산', NULL, '한국', 1945);
INSERT INTO author VALUES (10, '헤르만 헤세', 'Hermann Hesse', '독일', 1877);
INSERT INTO author VALUES (11, '전영애', NULL, '한국', 1951);
INSERT INTO author VALUES (12, '조지 오웰', 'George Orwell', '영국', 1903);
INSERT INTO author VALUES (13, '정회성', NULL, '한국', NULL);
INSERT INTO author VALUES (14, 'J. K. 롤링', 'J. K. Rowling', '영국', 1965);
INSERT INTO author VALUES (15, '김혜원', NULL, '한국', NULL);
INSERT INTO author VALUES (16, '유발 하라리', 'Yuval Noah Harari', '이스라엘', 1976);
INSERT INTO author VALUES (17, '조현욱', NULL, '한국', NULL);
INSERT INTO author VALUES (18, '김명주', NULL, '한국', NULL);
INSERT INTO author VALUES (19, '재레드 다이아몬드', 'Jared Diamond', '미국', 1937);
INSERT INTO author VALUES (20, '김진준', NULL, '한국', NULL);
INSERT INTO author VALUES (21, '마이클 샌델', 'Michael J. Sandel', '미국', 1953);
INSERT INTO author VALUES (22, '이창신', NULL, '한국', NULL);
INSERT INTO author VALUES (23, '함규진', NULL, '한국', NULL);
INSERT INTO author VALUES (24, '칼 세이건', 'Carl Sagan', '미국', 1934);
INSERT INTO author VALUES (25, '홍승수', NULL, '한국', NULL);
INSERT INTO author VALUES (26, '리처드 도킨스', 'Richard Dawkins', '영국', 1941);
INSERT INTO author VALUES (27, '홍영남', NULL, '한국', NULL);
INSERT INTO author VALUES (28, '이상임', NULL, '한국', NULL);
INSERT INTO author VALUES (29, '레이첼 카슨', 'Rachel Carson', '미국', 1907);
INSERT INTO author VALUES (30, '김은령', NULL, '한국', NULL);
INSERT INTO author VALUES (31, '기시미 이치로', '岸見一郎', '일본', 1956);
INSERT INTO author VALUES (32, '고가 후미타케', '古賀史健', '일본', 1973);
INSERT INTO author VALUES (33, '전경아', NULL, '한국', NULL);
INSERT INTO author VALUES (34, '박웅현', NULL, '한국', 1961);
INSERT INTO author VALUES (35, '유홍준', NULL, '한국', 1949);
INSERT INTO author VALUES (36, '이민진', 'Min Jin Lee', '미국', 1968);
INSERT INTO author VALUES (37, '이미정', NULL, '한국', NULL);
INSERT INTO author VALUES (38, '류츠신', '刘慈欣', '중국', 1963);
INSERT INTO author VALUES (39, '이현아', NULL, '한국', NULL);
INSERT INTO author VALUES (40, '파울로 코엘료', 'Paulo Coelho', '브라질', 1947);
INSERT INTO author VALUES (41, '최정수', NULL, '한국', NULL);
INSERT INTO author VALUES (42, '어니스트 헤밍웨이', 'Ernest Hemingway', '미국', 1899);
INSERT INTO author VALUES (43, '김욱동', NULL, '한국', NULL);
INSERT INTO author VALUES (44, '양귀자', NULL, '한국', 1955);
INSERT INTO author VALUES (45, '제임스 클리어', 'James Clear', '미국', NULL);
INSERT INTO author VALUES (46, '이한이', NULL, '한국', NULL);
INSERT INTO author VALUES (47, '리처드 하워드', 'Richard Howard', '미국', 1929);

-- book_author (53행)
INSERT INTO book_author VALUES (1, 1, '지은이', 1);
INSERT INTO book_author VALUES (2, 1, '지은이', 1);
INSERT INTO book_author VALUES (3, 1, '지은이', 1);
INSERT INTO book_author VALUES (4, 2, '지은이', 1);
INSERT INTO book_author VALUES (5, 3, '지은이', 1);
INSERT INTO book_author VALUES (6, 4, '지은이', 1);
INSERT INTO book_author VALUES (7, 5, '지은이', 1);
INSERT INTO book_author VALUES (8, 6, '지은이', 1);
INSERT INTO book_author VALUES (9, 7, '지은이', 1);
INSERT INTO book_author VALUES (9, 8, '옮긴이', 1);
INSERT INTO book_author VALUES (10, 7, '지은이', 1);
INSERT INTO book_author VALUES (10, 9, '옮긴이', 1);
INSERT INTO book_author VALUES (11, 10, '지은이', 1);
INSERT INTO book_author VALUES (11, 11, '옮긴이', 1);
INSERT INTO book_author VALUES (12, 12, '지은이', 1);
INSERT INTO book_author VALUES (12, 13, '옮긴이', 1);
INSERT INTO book_author VALUES (13, 14, '지은이', 1);
INSERT INTO book_author VALUES (13, 15, '옮긴이', 1);
INSERT INTO book_author VALUES (14, 16, '지은이', 1);
INSERT INTO book_author VALUES (14, 17, '옮긴이', 1);
INSERT INTO book_author VALUES (15, 16, '지은이', 1);
INSERT INTO book_author VALUES (15, 18, '옮긴이', 1);
INSERT INTO book_author VALUES (16, 19, '지은이', 1);
INSERT INTO book_author VALUES (16, 20, '옮긴이', 1);
INSERT INTO book_author VALUES (17, 21, '지은이', 1);
INSERT INTO book_author VALUES (17, 22, '옮긴이', 1);
INSERT INTO book_author VALUES (18, 21, '지은이', 1);
INSERT INTO book_author VALUES (18, 23, '옮긴이', 1);
INSERT INTO book_author VALUES (19, 24, '지은이', 1);
INSERT INTO book_author VALUES (19, 25, '옮긴이', 1);
INSERT INTO book_author VALUES (20, 26, '지은이', 1);
INSERT INTO book_author VALUES (20, 27, '옮긴이', 1);
INSERT INTO book_author VALUES (20, 28, '옮긴이', 2);
INSERT INTO book_author VALUES (21, 29, '지은이', 1);
INSERT INTO book_author VALUES (21, 30, '옮긴이', 1);
INSERT INTO book_author VALUES (22, 31, '지은이', 1);
INSERT INTO book_author VALUES (22, 32, '지은이', 2);
INSERT INTO book_author VALUES (22, 33, '옮긴이', 1);
INSERT INTO book_author VALUES (23, 34, '지은이', 1);
INSERT INTO book_author VALUES (24, 35, '지은이', 1);
INSERT INTO book_author VALUES (25, 36, '지은이', 1);
INSERT INTO book_author VALUES (25, 37, '옮긴이', 1);
INSERT INTO book_author VALUES (26, 38, '지은이', 1);
INSERT INTO book_author VALUES (26, 39, '옮긴이', 1);
INSERT INTO book_author VALUES (27, 40, '지은이', 1);
INSERT INTO book_author VALUES (27, 41, '옮긴이', 1);
INSERT INTO book_author VALUES (28, 42, '지은이', 1);
INSERT INTO book_author VALUES (28, 43, '옮긴이', 1);
INSERT INTO book_author VALUES (29, 44, '지은이', 1);
INSERT INTO book_author VALUES (30, 45, '지은이', 1);
INSERT INTO book_author VALUES (30, 46, '옮긴이', 1);
INSERT INTO book_author VALUES (31, 7, '지은이', 1);
INSERT INTO book_author VALUES (31, 47, '옮긴이', 1);

-- item (55행)
INSERT INTO item VALUES ('EM000101', 1, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000108', 1, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000115', 1, '보존서고', '대출가능');
INSERT INTO item VALUES ('EM000122', 2, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000129', 2, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000136', 2, '보존서고', '대출중');
INSERT INTO item VALUES ('EM000143', 3, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000150', 3, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000157', 3, '보존서고', '대출가능');
INSERT INTO item VALUES ('EM000164', 4, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000171', 4, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000178', 5, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000185', 5, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000192', 6, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000199', 6, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000206', 6, '보존서고', '대출가능');
INSERT INTO item VALUES ('EM000213', 7, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000220', 7, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000227', 8, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000234', 9, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000241', 9, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000248', 10, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000255', 11, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000262', 11, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000269', 12, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000276', 12, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000283', 13, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000290', 14, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000297', 14, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000304', 14, '보존서고', '대출가능');
INSERT INTO item VALUES ('EM000311', 15, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000318', 15, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000325', 16, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000332', 17, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000339', 17, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000346', 18, '3층 사회과학자료실', '대출가능');
INSERT INTO item VALUES ('EM000353', 18, '3층 사회과학자료실', '대출가능');
INSERT INTO item VALUES ('EM000360', 19, '4층 자연과학자료실', '대출가능');
INSERT INTO item VALUES ('EM000367', 20, '4층 자연과학자료실', '대출중');
INSERT INTO item VALUES ('EM000374', 21, '4층 자연과학자료실', '대출가능');
INSERT INTO item VALUES ('EM000381', 22, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000388', 22, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000395', 23, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000402', 24, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000409', 25, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000416', 25, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000423', 26, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000430', 26, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000437', 27, '2층 인문자료실', '대출중');
INSERT INTO item VALUES ('EM000444', 28, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000451', 29, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000458', 29, '2층 인문자료실', '대출가능');
INSERT INTO item VALUES ('EM000465', 30, '3층 사회과학자료실', '대출중');
INSERT INTO item VALUES ('EM000472', 30, '3층 사회과학자료실', '대출가능');
INSERT INTO item VALUES ('EM000479', 31, '2층 인문자료실', '대출가능');

-- member (20행)
INSERT INTO member VALUES (1, '김하늘', '학부생', '문헌정보학과', '2024-03-02');
INSERT INTO member VALUES (2, '이도윤', '학부생', '국어국문학과', '2023-03-02');
INSERT INTO member VALUES (3, '박서준', '학부생', '경영학과', '2025-03-03');
INSERT INTO member VALUES (4, '최지우', '학부생', '문헌정보학과', '2025-03-03');
INSERT INTO member VALUES (5, '정민서', '학부생', '생명과학과', '2022-03-02');
INSERT INTO member VALUES (6, '강예린', '학부생', '사학과', '2024-03-02');
INSERT INTO member VALUES (7, '조하준', '학부생', '철학과', '2026-03-02');
INSERT INTO member VALUES (8, '윤채원', '학부생', '문헌정보학과', '2026-03-02');
INSERT INTO member VALUES (9, '장시우', '학부생', '물리학과', '2023-03-02');
INSERT INTO member VALUES (10, '임서연', '대학원생', '문헌정보학과', '2025-03-03');
INSERT INTO member VALUES (11, '한지호', '대학원생', '문헌정보학과', '2026-03-02');
INSERT INTO member VALUES (12, '오수아', '대학원생', '기록관리학협동과정', '2024-03-02');
INSERT INTO member VALUES (13, '서유진', '대학원생', '사회학과', '2025-09-01');
INSERT INTO member VALUES (14, '신동현', '대학원생', '국어국문학과', '2026-09-01');
INSERT INTO member VALUES (15, '권태호', '교원', '문헌정보학과', '2015-03-01');
INSERT INTO member VALUES (16, '황미경', '교원', '사학과', '2019-09-01');
INSERT INTO member VALUES (17, '안준영', '교원', '경영학과', '2021-03-01');
INSERT INTO member VALUES (18, '송은비', '일반', NULL, '2025-07-15');
INSERT INTO member VALUES (19, '유정훈', '일반', NULL, '2026-01-20');
INSERT INTO member VALUES (20, '배나래', '일반', NULL, '2026-10-02');

-- loan (116행)
INSERT INTO loan VALUES (1, 'EM000255', 12, '2026-09-05', '2026-09-19', '2026-09-24');
INSERT INTO loan VALUES (2, 'EM000136', 13, '2026-09-06', '2026-09-20', '2026-09-22');
INSERT INTO loan VALUES (3, 'EM000101', 8, '2026-09-08', '2026-09-22', '2026-09-21');
INSERT INTO loan VALUES (4, 'EM000129', 12, '2026-09-08', '2026-09-22', '2026-09-24');
INSERT INTO loan VALUES (5, 'EM000234', 11, '2026-09-08', '2026-09-22', '2026-09-20');
INSERT INTO loan VALUES (6, 'EM000269', 8, '2026-09-08', '2026-09-22', '2026-09-15');
INSERT INTO loan VALUES (7, 'EM000332', 6, '2026-09-08', '2026-09-22', '2026-09-15');
INSERT INTO loan VALUES (8, 'EM000353', 11, '2026-09-08', '2026-09-22', '2026-09-20');
INSERT INTO loan VALUES (9, 'EM000465', 11, '2026-09-08', '2026-09-22', '2026-10-01');
INSERT INTO loan VALUES (10, 'EM000262', 11, '2026-09-09', '2026-09-23', '2026-09-21');
INSERT INTO loan VALUES (11, 'EM000115', 19, '2026-09-10', '2026-09-24', '2026-09-15');
INSERT INTO loan VALUES (12, 'EM000318', 11, '2026-09-10', '2026-09-24', '2026-10-20');
INSERT INTO loan VALUES (13, 'EM000325', 1, '2026-09-11', '2026-09-25', '2026-09-16');
INSERT INTO loan VALUES (14, 'EM000458', 16, '2026-09-11', '2026-09-25', '2026-09-20');
INSERT INTO loan VALUES (15, 'EM000122', 2, '2026-09-12', '2026-09-26', '2026-09-15');
INSERT INTO loan VALUES (16, 'EM000472', 10, '2026-09-12', '2026-09-26', '2026-09-28');
INSERT INTO loan VALUES (17, 'EM000108', 14, '2026-09-13', '2026-09-27', '2026-09-22');
INSERT INTO loan VALUES (18, 'EM000171', 14, '2026-09-13', '2026-09-27', '2026-09-16');
INSERT INTO loan VALUES (19, 'EM000283', 14, '2026-09-13', '2026-09-27', '2026-10-02');
INSERT INTO loan VALUES (20, 'EM000164', 4, '2026-09-14', '2026-09-28', '2026-10-03');
INSERT INTO loan VALUES (21, 'EM000297', 1, '2026-09-14', '2026-09-28', '2026-10-03');
INSERT INTO loan VALUES (22, 'EM000381', 15, '2026-09-14', '2026-09-28', '2026-09-26');
INSERT INTO loan VALUES (23, 'EM000178', 10, '2026-09-15', '2026-09-29', '2026-09-20');
INSERT INTO loan VALUES (24, 'EM000199', 18, '2026-09-15', '2026-09-29', '2026-10-18');
INSERT INTO loan VALUES (25, 'EM000241', 8, '2026-09-15', '2026-09-29', '2026-09-24');
INSERT INTO loan VALUES (26, 'EM000388', 8, '2026-09-15', '2026-09-29', '2026-09-18');
INSERT INTO loan VALUES (27, 'EM000409', 16, '2026-09-15', '2026-09-29', '2026-09-29');
INSERT INTO loan VALUES (28, 'EM000290', 15, '2026-09-16', '2026-09-30', '2026-09-30');
INSERT INTO loan VALUES (29, 'EM000192', 11, '2026-09-17', '2026-10-01', '2026-10-06');
INSERT INTO loan VALUES (30, 'EM000248', 13, '2026-09-17', '2026-10-01', '2026-09-24');
INSERT INTO loan VALUES (31, 'EM000367', 14, '2026-09-17', '2026-10-01', '2026-10-06');
INSERT INTO loan VALUES (32, 'EM000395', 3, '2026-09-17', '2026-10-01', '2026-09-24');
INSERT INTO loan VALUES (33, 'EM000416', 10, '2026-09-17', '2026-10-01', '2026-09-20');
INSERT INTO loan VALUES (34, 'EM000451', 1, '2026-09-17', '2026-10-01', '2026-09-27');
INSERT INTO loan VALUES (35, 'EM000143', 4, '2026-09-18', '2026-10-02', '2026-10-07');
INSERT INTO loan VALUES (36, 'EM000150', 6, '2026-09-19', '2026-10-03', '2026-10-12');
INSERT INTO loan VALUES (37, 'EM000115', 6, '2026-09-21', '2026-10-05', '2026-10-31');
INSERT INTO loan VALUES (38, 'EM000185', 3, '2026-09-21', '2026-10-05', '2026-09-24');
INSERT INTO loan VALUES (39, 'EM000220', 10, '2026-09-21', '2026-10-05', '2026-10-24');
INSERT INTO loan VALUES (40, 'EM000430', 18, '2026-09-21', '2026-10-05', '2026-10-04');
INSERT INTO loan VALUES (41, 'EM000122', 10, '2026-09-22', '2026-10-06', '2026-10-15');
INSERT INTO loan VALUES (42, 'EM000269', 15, '2026-09-22', '2026-10-06', '2026-10-11');
INSERT INTO loan VALUES (43, 'EM000101', 8, '2026-09-23', '2026-10-07', '2026-10-26');
INSERT INTO loan VALUES (44, 'EM000171', 15, '2026-09-23', '2026-10-07', '2026-10-02');
INSERT INTO loan VALUES (45, 'EM000213', 13, '2026-09-23', '2026-10-07', '2026-10-02');
INSERT INTO loan VALUES (46, 'EM000311', 4, '2026-09-24', '2026-10-08', '2026-09-27');
INSERT INTO loan VALUES (47, 'EM000437', 8, '2026-09-24', '2026-10-08', '2026-10-03');
INSERT INTO loan VALUES (48, 'EM000332', 10, '2026-09-25', '2026-10-09', '2026-09-28');
INSERT INTO loan VALUES (49, 'EM000276', 8, '2026-09-26', '2026-10-10', '2026-10-15');
INSERT INTO loan VALUES (50, 'EM000360', 12, '2026-09-26', '2026-10-10', '2026-10-03');
INSERT INTO loan VALUES (51, 'EM000388', 8, '2026-09-26', '2026-10-10', '2026-09-29');
INSERT INTO loan VALUES (52, 'EM000423', 18, '2026-09-27', '2026-10-11', '2026-10-13');
INSERT INTO loan VALUES (53, 'EM000248', 10, '2026-09-28', '2026-10-12', '2026-10-12');
INSERT INTO loan VALUES (54, 'EM000108', 1, '2026-09-29', '2026-10-13', '2026-10-12');
INSERT INTO loan VALUES (55, 'EM000129', 10, '2026-09-29', '2026-10-13', '2026-10-08');
INSERT INTO loan VALUES (56, 'EM000136', 1, '2026-09-30', '2026-10-14', '2026-10-14');
INSERT INTO loan VALUES (57, 'EM000178', 16, '2026-09-30', '2026-10-14', '2026-10-14');
INSERT INTO loan VALUES (58, 'EM000255', 15, '2026-09-30', '2026-10-14', '2026-10-14');
INSERT INTO loan VALUES (59, 'EM000339', 4, '2026-09-30', '2026-10-14', '2026-10-23');
INSERT INTO loan VALUES (60, 'EM000346', 5, '2026-09-30', '2026-10-14', '2026-10-13');
INSERT INTO loan VALUES (61, 'EM000234', 8, '2026-10-02', '2026-10-16', '2026-10-16');
INSERT INTO loan VALUES (62, 'EM000311', 1, '2026-10-03', '2026-10-17', '2026-10-19');
INSERT INTO loan VALUES (63, 'EM000388', 11, '2026-10-03', '2026-10-17', '2026-10-15');
INSERT INTO loan VALUES (64, 'EM000297', 8, '2026-10-04', '2026-10-18', '2026-10-17');
INSERT INTO loan VALUES (65, 'EM000185', 1, '2026-10-05', '2026-10-19', '2026-10-12');
INSERT INTO loan VALUES (66, 'EM000227', 15, '2026-10-05', '2026-10-19', '2026-10-17');
INSERT INTO loan VALUES (67, 'EM000353', 15, '2026-10-05', '2026-10-19', '2026-10-10');
INSERT INTO loan VALUES (68, 'EM000262', 15, '2026-10-06', '2026-10-20', NULL);
INSERT INTO loan VALUES (69, 'EM000290', 8, '2026-10-06', '2026-10-20', '2026-10-19');
INSERT INTO loan VALUES (70, 'EM000458', 4, '2026-10-06', '2026-10-20', '2026-10-20');
INSERT INTO loan VALUES (71, 'EM000416', 16, '2026-10-07', '2026-10-21', NULL);
INSERT INTO loan VALUES (72, 'EM000472', 15, '2026-10-08', '2026-10-22', '2026-10-24');
INSERT INTO loan VALUES (73, 'EM000143', 4, '2026-10-09', '2026-10-23', '2026-10-22');
INSERT INTO loan VALUES (74, 'EM000332', 12, '2026-10-09', '2026-10-23', '2026-10-25');
INSERT INTO loan VALUES (75, 'EM000451', 7, '2026-10-09', '2026-10-23', '2026-10-21');
INSERT INTO loan VALUES (76, 'EM000381', 1, '2026-10-10', '2026-10-24', '2026-10-23');
INSERT INTO loan VALUES (77, 'EM000241', 13, '2026-10-11', '2026-10-25', '2026-10-27');
INSERT INTO loan VALUES (78, 'EM000283', 7, '2026-10-11', '2026-10-25', '2026-10-25');
INSERT INTO loan VALUES (79, 'EM000409', 10, '2026-10-11', '2026-10-25', '2026-11-03');
INSERT INTO loan VALUES (80, 'EM000129', 4, '2026-10-12', '2026-10-26', '2026-11-04');
INSERT INTO loan VALUES (81, 'EM000192', 1, '2026-10-12', '2026-10-26', '2026-10-19');
INSERT INTO loan VALUES (82, 'EM000325', 10, '2026-10-12', '2026-10-26', '2026-10-26');
INSERT INTO loan VALUES (83, 'EM000367', 11, '2026-10-13', '2026-10-27', '2026-10-20');
INSERT INTO loan VALUES (84, 'EM000150', 4, '2026-10-15', '2026-10-29', NULL);
INSERT INTO loan VALUES (85, 'EM000395', 11, '2026-10-15', '2026-10-29', NULL);
INSERT INTO loan VALUES (86, 'EM000171', 1, '2026-10-16', '2026-10-30', NULL);
INSERT INTO loan VALUES (87, 'EM000108', 15, '2026-10-17', '2026-10-31', '2026-10-22');
INSERT INTO loan VALUES (88, 'EM000122', 2, '2026-10-18', '2026-11-01', '2026-10-31');
INSERT INTO loan VALUES (89, 'EM000185', 14, '2026-10-19', '2026-11-02', '2026-10-29');
INSERT INTO loan VALUES (90, 'EM000199', 4, '2026-10-19', '2026-11-02', NULL);
INSERT INTO loan VALUES (91, 'EM000269', 10, '2026-10-19', '2026-11-02', '2026-10-22');
INSERT INTO loan VALUES (92, 'EM000297', 11, '2026-10-19', '2026-11-02', NULL);
INSERT INTO loan VALUES (93, 'EM000164', 8, '2026-10-20', '2026-11-03', '2026-10-23');
INSERT INTO loan VALUES (94, 'EM000430', 18, '2026-10-20', '2026-11-03', '2026-11-03');
INSERT INTO loan VALUES (95, 'EM000136', 4, '2026-10-21', '2026-11-04', NULL);
INSERT INTO loan VALUES (96, 'EM000213', 12, '2026-10-21', '2026-11-04', NULL);
INSERT INTO loan VALUES (97, 'EM000248', 13, '2026-10-21', '2026-11-04', NULL);
INSERT INTO loan VALUES (98, 'EM000346', 10, '2026-10-21', '2026-11-04', '2026-11-03');
INSERT INTO loan VALUES (99, 'EM000178', 15, '2026-10-22', '2026-11-05', '2026-11-03');
INSERT INTO loan VALUES (100, 'EM000234', 12, '2026-10-23', '2026-11-06', NULL);
INSERT INTO loan VALUES (101, 'EM000465', 8, '2026-10-23', '2026-11-06', NULL);
INSERT INTO loan VALUES (102, 'EM000437', 6, '2026-10-24', '2026-11-07', NULL);
INSERT INTO loan VALUES (103, 'EM000290', 8, '2026-10-26', '2026-11-09', NULL);
INSERT INTO loan VALUES (104, 'EM000360', 12, '2026-10-26', '2026-11-09', '2026-10-29');
INSERT INTO loan VALUES (105, 'EM000192', 15, '2026-10-27', '2026-11-10', NULL);
INSERT INTO loan VALUES (106, 'EM000388', 8, '2026-10-27', '2026-11-10', NULL);
INSERT INTO loan VALUES (107, 'EM000423', 18, '2026-10-27', '2026-11-10', '2026-11-03');
INSERT INTO loan VALUES (108, 'EM000276', 11, '2026-10-29', '2026-11-12', NULL);
INSERT INTO loan VALUES (109, 'EM000143', 8, '2026-10-30', '2026-11-13', NULL);
INSERT INTO loan VALUES (110, 'EM000318', 11, '2026-10-30', '2026-11-13', NULL);
INSERT INTO loan VALUES (111, 'EM000339', 14, '2026-10-30', '2026-11-13', '2026-11-02');
INSERT INTO loan VALUES (112, 'EM000164', 10, '2026-11-01', '2026-11-15', NULL);
INSERT INTO loan VALUES (113, 'EM000101', 6, '2026-11-02', '2026-11-16', NULL);
INSERT INTO loan VALUES (114, 'EM000269', 16, '2026-11-02', '2026-11-16', NULL);
INSERT INTO loan VALUES (115, 'EM000367', 1, '2026-11-03', '2026-11-17', NULL);
INSERT INTO loan VALUES (116, 'EM000122', 16, '2026-11-04', '2026-11-18', NULL);

-- reservation (11행)
INSERT INTO reservation VALUES (1, 1, 10, '2026-09-20', '완료');
INSERT INTO reservation VALUES (2, 2, 4, '2026-10-05', '완료');
INSERT INTO reservation VALUES (3, 14, 11, '2026-10-12', '취소');
INSERT INTO reservation VALUES (4, 6, 1, '2026-10-20', '대기');
INSERT INTO reservation VALUES (5, 2, 12, '2026-10-22', '대기');
INSERT INTO reservation VALUES (6, 3, 15, '2026-10-25', '대기');
INSERT INTO reservation VALUES (7, 25, 18, '2026-10-26', '취소');
INSERT INTO reservation VALUES (8, 1, 8, '2026-10-28', '대기');
INSERT INTO reservation VALUES (9, 22, 2, '2026-10-30', '취소');
INSERT INTO reservation VALUES (10, 14, 13, '2026-11-01', '대기');
INSERT INTO reservation VALUES (11, 6, 16, '2026-11-03', '대기');
