<?php
// B 실습(SQL 실습실)의 문제와 채점 기준. 답 SQL은 서버에만 있고 학생 화면에는 보내지 않습니다.
// answer: 학생 결과와 비교할 SQL(여러 개면 그 가운데 하나와 같으면 정답). ordered: 순서까지 같아야 하는지.
// check: 학생 DB 상태를 보는 SQL(1이면 완료). :user 자리에는 학생 아이디가 들어갑니다.

const SQL_SETS = [
    'catalog' => ['title' => 'B1 목록 DB에 묻기', 'mode' => 'catalog',
        'intro' => '서버의 catalog.db에는 권장도서 2,175권이 book 테이블에 들어 있습니다. 읽기만 할 수 있습니다. 3강에서 배운 SELECT로 물어보세요.',
        'starter' => "SELECT * FROM book LIMIT 5;"],
    'norm' => ['title' => 'B2 지은이 칸 나누기(정규화)', 'mode' => 'catalog',
        'intro' => "book.author 칸에는 '정은주 글 | 해랑 그림'처럼 여러 사람과 역할이 한 칸에 뭉쳐 있습니다. 이것을 사람(person) 표와 역할 기록(credit) 표로 나눠 두었습니다. role 표에는 역할마다 MARC 역할 부호가 있습니다.",
        'starter' => "SELECT b.id, b.title, b.author, p.name, c.role\nFROM book b\nJOIN credit c ON c.book_id = b.id\nJOIN person p ON p.person_id = c.person_id\nWHERE b.id = 2;"],
    'shared' => ['title' => 'B3 함께 쓰는 DB에 기록 넣기', 'mode' => 'shared',
        'intro' => '우리 반 모두가 하나의 reading_log 테이블에 기록을 넣습니다. 내가 넣은 기록이 친구 화면에도 바로 나타납니다. 넣기(INSERT)와 읽기(SELECT)만 됩니다. student 칸은 서버가 내 아이디로 채웁니다.',
        'starter' => "-- 책 번호(book_id)는 B1에서 찾아 두세요\nINSERT INTO reading_log (book_id, tag, note)\nVALUES (2, '고양이', '백만 번 다시 태어나는 이야기');\n\nSELECT * FROM reading_log ORDER BY id DESC LIMIT 10;"],
    'mydb' => ['title' => 'B4 내 DB 만들고 고치기', 'mode' => 'mydb',
        'intro' => '나만 쓰는 DB(목록 DB의 복사본)입니다. CREATE, INSERT, UPDATE, DELETE, ALTER를 마음껏 해 보세요. 망가지면 [처음으로 되돌리기]를 누르면 됩니다.',
        'starter' => "SELECT name, type FROM sqlite_master ORDER BY type, name;"],
];

const SQL_EXERCISES = [
    // ---------- B1 목록 DB에 묻기 ----------
    ['id' => 'c1', 'set' => 'catalog', 'ask' => '목록에 책이 모두 몇 권인지 세어 보세요.', 'hint' => 'COUNT(*)',
        'answer' => ["SELECT COUNT(*) FROM book"]],
    ['id' => 'c2', 'set' => 'catalog', 'ask' => "연령(age)이 '7세부터'이고 갈래(genre)가 '그림책'인 책은 몇 권인가요?", 'hint' => "WHERE 조건 두 개를 AND로 잇습니다.",
        'answer' => ["SELECT COUNT(*) FROM book WHERE age = '7세부터' AND genre = '그림책'"]],
    ['id' => 'c3', 'set' => 'catalog', 'ask' => "책이름(title)에 '고양이'가 들어간 책의 책이름과 펴낸해(pub_year)를 보이세요.", 'hint' => "LIKE '%고양이%'",
        'answer' => ["SELECT title, pub_year FROM book WHERE title LIKE '%고양이%'"]],
    ['id' => 'c4', 'set' => 'catalog', 'ask' => '2020년이나 그 뒤에 펴낸 책은 몇 권인가요?', 'hint' => 'pub_year >= 2020. 답이 둘로 나뉠 수 있습니다. 왜 그런지는 B1의 마지막 문제에서 봅니다.',
        'answer' => ["SELECT COUNT(*) FROM book WHERE pub_year >= 2020", "SELECT COUNT(*) FROM book WHERE typeof(pub_year) = 'integer' AND pub_year >= 2020"]],
    ['id' => 'c5', 'set' => 'catalog', 'ask' => '출판사(publisher)별로 책이 몇 권인지 세어, 많은 순서로 다섯 곳의 출판사 이름과 권수를 보이세요.', 'hint' => 'GROUP BY, ORDER BY … DESC, LIMIT 5', 'ordered' => true,
        'answer' => ["SELECT publisher, COUNT(*) FROM book GROUP BY publisher ORDER BY COUNT(*) DESC LIMIT 5"]],
    ['id' => 'c6', 'set' => 'catalog', 'ask' => '갈래(genre)마다 몇 권인지 보이세요. 순서는 상관없습니다.', 'hint' => 'GROUP BY genre',
        'answer' => ["SELECT genre, COUNT(*) FROM book GROUP BY genre"]],
    ['id' => 'c7', 'set' => 'catalog', 'ask' => '1990년보다 먼저 펴낸 책의 책이름과 펴낸해를 보이세요.', 'hint' => 'pub_year < 1990',
        'answer' => ["SELECT title, pub_year FROM book WHERE pub_year < 1990"]],
    ['id' => 'c8', 'set' => 'catalog', 'ask' => '쪽수(pages) 칸에 숫자가 아닌 글자가 섞인 책은 몇 권인가요? 그런 값을 몇 개 직접 보고, 왜 생겼는지 생각해 보세요.', 'hint' => "pages GLOB '*[^0-9]*' 는 '숫자 아닌 글자가 하나라도 있다'는 뜻입니다.",
        'answer' => ["SELECT COUNT(*) FROM book WHERE pages GLOB '*[^0-9]*'"]],
    ['id' => 'c9', 'set' => 'catalog', 'ask' => '연령(age)별로 평균 쪽수를 구하세요. 숫자로만 된 쪽수만 셉니다.', 'hint' => "AVG(CAST(pages AS INTEGER)), WHERE pages NOT GLOB '*[^0-9]*'",
        'answer' => ["SELECT age, AVG(CAST(pages AS INTEGER)) FROM book WHERE pages NOT GLOB '*[^0-9]*' GROUP BY age", "SELECT age, AVG(pages) FROM book WHERE pages NOT GLOB '*[^0-9]*' GROUP BY age"]],
    ['id' => 'c10', 'set' => 'catalog', 'ask' => '펴낸해(pub_year)가 정수가 아닌 책의 번호, 책이름, 펴낸해를 보이세요. c4의 답이 둘로 나뉜 까닭입니다.', 'hint' => "typeof(pub_year) 는 값의 실제 자료형을 알려 줍니다. 비어 있는(NULL) 것도 정수가 아닙니다.",
        'answer' => ["SELECT id, title, pub_year FROM book WHERE typeof(pub_year) <> 'integer'"]],

    // ---------- B2 지은이 칸 나누기 ----------
    ['id' => 'n1', 'set' => 'norm', 'ask' => '사람(person) 표에는 몇 명이 있나요? 역할 기록(credit) 표에는 몇 건이 있나요? 두 수를 한 줄에 보이세요.', 'hint' => '(SELECT COUNT(*) FROM person), (SELECT COUNT(*) FROM credit)',
        'answer' => ["SELECT (SELECT COUNT(*) FROM person), (SELECT COUNT(*) FROM credit)"]],
    ['id' => 'n2', 'set' => 'norm', 'ask' => "'권정생'이 글(role = '글')을 쓴 책의 책이름을 모두 보이세요.", 'hint' => 'book, credit, person 세 표를 JOIN 합니다.',
        'answer' => ["SELECT b.title FROM book b JOIN credit c ON c.book_id = b.id JOIN person p ON p.person_id = c.person_id WHERE p.name = '권정생' AND c.role = '글'"]],
    ['id' => 'n3', 'set' => 'norm', 'ask' => "그림(role = '그림')을 맡은 책이 가장 많은 사람 세 명의 이름과 권수를 많은 순서로 보이세요.", 'hint' => 'GROUP BY 사람, ORDER BY COUNT(*) DESC, LIMIT 3', 'ordered' => true,
        'answer' => ["SELECT p.name, COUNT(*) FROM credit c JOIN person p ON p.person_id = c.person_id WHERE c.role = '그림' GROUP BY p.person_id ORDER BY COUNT(*) DESC LIMIT 3"]],
    ['id' => 'n4', 'set' => 'norm', 'ask' => '한 사람이 글과 그림을 모두 맡은 책은 몇 권인가요?', 'hint' => 'credit 표를 자기 자신과 JOIN 합니다(같은 책, 같은 사람, 한쪽은 글, 다른 쪽은 그림).',
        'answer' => ["SELECT COUNT(DISTINCT a.book_id) FROM credit a JOIN credit b ON a.book_id = b.book_id AND a.person_id = b.person_id WHERE a.role = '글' AND b.role = '그림'"]],
    ['id' => 'n5', 'set' => 'norm', 'ask' => "옮긴이(role = '옮김')가 있는 책, 곧 번역서는 몇 권인가요?", 'hint' => 'COUNT(DISTINCT book_id)',
        'answer' => ["SELECT COUNT(DISTINCT book_id) FROM credit WHERE role = '옮김'"]],
    ['id' => 'n6', 'set' => 'norm', 'ask' => "지은이 칸에서 '이현'으로 찾은 책 수와, 사람 표에서 이름이 정확히 '이현'인 사람이 이름을 올린 책 수를 한 줄에 보이세요. 두 수가 왜 다른가요?", 'hint' => "(SELECT COUNT(*) FROM book WHERE author LIKE '%이현%'), (SELECT COUNT(DISTINCT c.book_id) FROM credit c JOIN person p … WHERE p.name = '이현')",
        'answer' => ["SELECT (SELECT COUNT(*) FROM book WHERE author LIKE '%이현%'), (SELECT COUNT(DISTINCT c.book_id) FROM credit c JOIN person p ON p.person_id = c.person_id WHERE p.name = '이현')"]],
    ['id' => 'n7', 'set' => 'norm', 'ask' => "역할이 '(확인 필요)'인 기록의 책 번호와 원래 표기(raw)를 보이세요. 사람이 고쳐야 할 기록들입니다.", 'hint' => "WHERE role = '(확인 필요)'",
        'answer' => ["SELECT book_id, raw FROM credit WHERE role = '(확인 필요)'"]],
    ['id' => 'n8', 'set' => 'norm', 'ask' => '역할(role)마다 기록이 몇 건인지 MARC 역할 부호(marc_code)와 함께 보이세요.', 'hint' => 'credit과 role을 role 칸으로 JOIN 하고 GROUP BY',
        'answer' => ["SELECT r.role, r.marc_code, COUNT(*) FROM credit c JOIN role r ON r.role = c.role GROUP BY r.role", "SELECT c.role, r.marc_code, COUNT(*) FROM credit c JOIN role r ON r.role = c.role GROUP BY c.role"]],

    // ---------- B3 함께 쓰는 DB ----------
    ['id' => 's1', 'set' => 'shared', 'ask' => 'reading_log에 내 기록을 하나 넣으세요. 책 번호(book_id)는 B1에서 찾은 실제 책 번호를 씁니다.', 'hint' => "INSERT INTO reading_log (book_id, tag, note) VALUES (책번호, '태그', '한 줄 생각');",
        'check' => "SELECT COUNT(*) >= 1 FROM reading_log WHERE student = :user AND book_id IN (SELECT id FROM cat.book)"],
    ['id' => 's2', 'set' => 'shared', 'ask' => '한 문장으로 기록 두 건을 한꺼번에 넣어 보세요. (내 기록이 모두 세 건 이상이 되면 완료)', 'hint' => "VALUES (…), (…);  괄호 묶음을 쉼표로 잇습니다.",
        'check' => "SELECT COUNT(*) >= 3 FROM reading_log WHERE student = :user"],
    ['id' => 's3', 'set' => 'shared', 'ask' => '우리 반 기록을 책이름과 함께 보이세요: 기록한 사람(student), 책이름(title), 태그(tag). 순서는 상관없습니다.', 'hint' => 'reading_log와 book을 book_id = id 로 JOIN',
        'answer' => ["SELECT r.student, b.title, r.tag FROM reading_log r JOIN book b ON b.id = r.book_id"]],
    ['id' => 's4', 'set' => 'shared', 'ask' => '태그(tag)마다 기록이 몇 건인지 세어 보세요. 우리 반은 어떤 말을 많이 붙였나요?', 'hint' => 'GROUP BY tag',
        'answer' => ["SELECT tag, COUNT(*) FROM reading_log GROUP BY tag"]],

    // ---------- B4 내 DB ----------
    ['id' => 'm1', 'set' => 'mydb', 'ask' => '내 서가 테이블 my_shelf를 만드세요. 칸: book_id(정수, book.id를 가리킴), memo(글자).', 'hint' => "CREATE TABLE my_shelf (book_id INTEGER REFERENCES book(id), memo TEXT);",
        'check' => "SELECT COUNT(*) = 1 FROM sqlite_master WHERE type = 'table' AND name = 'my_shelf' AND sql LIKE '%book_id%' AND sql LIKE '%memo%'"],
    ['id' => 'm2', 'set' => 'mydb', 'ask' => 'my_shelf에 실제 있는 책 세 권을 넣으세요.', 'hint' => "INSERT INTO my_shelf (book_id, memo) VALUES (2, '다시 읽고 싶음');",
        'check' => "SELECT COUNT(*) >= 3 FROM my_shelf WHERE book_id IN (SELECT id FROM book)"],
    ['id' => 'm3', 'set' => 'mydb', 'ask' => "book 표 지은이 칸에 '옮김'을 '욺김'으로 잘못 적은 책이 한 권 있습니다. UPDATE로 바로잡으세요.", 'hint' => "UPDATE book SET author = REPLACE(author, '욺김', '옮김') WHERE author LIKE '%욺김%';",
        'check' => "SELECT (SELECT COUNT(*) FROM book WHERE author LIKE '%욺김%') = 0 AND (SELECT COUNT(*) FROM book WHERE author LIKE '%최선경 옮김%') >= 1"],
    ['id' => 'm4', 'set' => 'mydb', 'ask' => '출판사 표 publisher(publisher_id 정수 기본 키, name 글자 UNIQUE)를 만들고, book에 나오는 출판사 이름을 겹치지 않게 모두 넣으세요.', 'hint' => "INSERT INTO publisher (name) SELECT DISTINCT publisher FROM book WHERE publisher IS NOT NULL;",
        'check' => "SELECT (SELECT COUNT(*) FROM publisher) > 0 AND (SELECT COUNT(*) FROM book WHERE publisher IS NOT NULL AND publisher NOT IN (SELECT name FROM publisher)) = 0"],
    ['id' => 'm5', 'set' => 'mydb', 'ask' => 'book 표에 publisher_id 칸을 더하고, 출판사 이름에 맞는 번호로 채우세요.', 'hint' => "ALTER TABLE book ADD COLUMN publisher_id INTEGER;\nUPDATE book SET publisher_id = (SELECT publisher_id FROM publisher WHERE publisher.name = book.publisher);",
        'check' => "SELECT (SELECT COUNT(*) FROM sqlite_master WHERE name = 'book' AND sql LIKE '%publisher_id%') = 1 AND (SELECT COUNT(*) FROM book b WHERE b.publisher IS NOT NULL AND (b.publisher_id IS NULL OR b.publisher_id <> (SELECT publisher_id FROM publisher p WHERE p.name = b.publisher))) = 0"],
    ['id' => 'm6', 'set' => 'mydb', 'ask' => 'my_shelf, book, publisher를 이어 보는 뷰(VIEW) my_view를 만드세요: 책이름, 출판사 이름, 메모.', 'hint' => "CREATE VIEW my_view AS SELECT b.title, p.name, s.memo FROM my_shelf s JOIN book b ON b.id = s.book_id JOIN publisher p ON p.publisher_id = b.publisher_id;",
        'check' => "SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type = 'view' AND name = 'my_view') = 1 AND (SELECT COUNT(*) FROM my_view) >= 1"],
    ['id' => 'm7', 'set' => 'mydb', 'ask' => "펴낸해가 비어 있는(NULL) 책을 book 표에서 지우세요. 지우기 전에 같은 조건으로 SELECT 해서 무엇이 지워질지 먼저 봅니다.", 'hint' => "SELECT * FROM book WHERE pub_year IS NULL;  그다음  DELETE FROM book WHERE pub_year IS NULL;",
        'check' => "SELECT (SELECT COUNT(*) FROM book WHERE pub_year IS NULL) = 0 AND (SELECT COUNT(*) FROM book) >= 2170"],
];

function exercises_of(string $set): array { return array_values(array_filter(SQL_EXERCISES, fn($e) => $e['set'] === $set)); }
function exercise(string $id): ?array { foreach (SQL_EXERCISES as $e) if ($e['id'] === $id) return $e; return null; }
