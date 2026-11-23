-- 3단계: 엑셀에서 저장한 books.csv를 데이터베이스(books.db)의 book 테이블에 넣습니다.
-- 서버에서 이렇게 실행합니다 (data 폴더 안에서):
--   cd /srv/class-lab/data
--   sqlite3 books.db < load.sql
-- 여러 번 실행해도 됩니다. 실행할 때마다 테이블을 새로 만들고 다시 채웁니다.

DROP TABLE IF EXISTS book;

-- 엑셀 머리글(한글)과 DB 열 이름(영문)의 짝:
--   번호→id  책이름→title  지은이→author  출판사→publisher  펴낸해→pub_year
--   쪽수→pages  연령→age  갈래→genre  연구회링크→url
CREATE TABLE book (
  id         INTEGER PRIMARY KEY,   -- 연구회 목록의 책 번호
  title      TEXT NOT NULL,         -- 책이름
  author     TEXT,                  -- 지은이 (글·그림·옮김을 연구회 표기 그대로)
  publisher  TEXT,                  -- 출판사
  pub_year   INTEGER,               -- 펴낸해
  pages      TEXT,                  -- 쪽수 (여러 권이면 '각 136'처럼 글자라서 TEXT)
  age        TEXT,                  -- 연령 (예: 9세부터)
  genre      TEXT,                  -- 갈래 (예: 그림책, 우리동화)
  url        TEXT                   -- 연구회 누리집의 이 책 소개 주소
);

-- CSV 파일을 읽어 넣기 (첫 줄 머리글은 건너뜀)
.import --csv --skip 1 books.csv book

-- 빈 칸은 '값 없음(NULL)'으로
UPDATE book SET pages = NULL WHERE pages = '';
UPDATE book SET pub_year = NULL WHERE pub_year = '';

-- 찾기를 빠르게 하는 색인
CREATE INDEX idx_book_title ON book(title);
CREATE INDEX idx_book_author ON book(author);

-- 확인: 몇 권 들어갔나, 연령별로 몇 권인가
.mode box
SELECT COUNT(*) AS 들어간_책 FROM book;
SELECT age AS 연령, COUNT(*) AS 권수 FROM book GROUP BY age ORDER BY 권수 DESC LIMIT 10;
