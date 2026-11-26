<?php
// 학생 실습실 준비: var 폴더, 목록 DB(catalog.db), 함께 쓰는 DB(shared.db), 수업 코드를 만듭니다.
// install.sh가 부릅니다. 여러 번 실행해도 학생 자료(홈페이지, 내 DB, 아카이브)는 지우지 않습니다.
// 실행: php setup/lab-init.php            (수업 코드가 없을 때만 새로 만듦)
//       php setup/lab-init.php --codes    (수업 코드와 교수 코드를 새로 만듦)
//       php setup/lab-init.php --catalog  (목록 DB만 다시 만듦)
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit;
require __DIR__ . '/../lib/app.php';

$args = array_slice($argv, 1);
$dataDir = realpath(__DIR__ . '/../data');
foreach (['', '/sites', '/mydb', '/archive', '/backup', '/sessions', '/samples', '/tmp'] as $d) {
    if (!is_dir(LAB_VAR . $d)) mkdir(LAB_VAR . $d, 0775, true);
}

function csv_rows(string $file): array {
    $f = fopen($file, 'r'); $head = null; $rows = [];
    while (($r = fgetcsv($f, 0, ',', '"', '')) !== false) {
        if ($head === null) { $r[0] = preg_replace('/^\xEF\xBB\xBF/', '', $r[0]); $head = $r; continue; }
        if (count($r) === count($head)) $rows[] = $r;
    }
    fclose($f);
    return $rows;
}

// ---------- 목록 DB ----------
$catalog = LAB_VAR . '/catalog.db';
if (!is_file($catalog) || in_array('--catalog', $args, true)) {
    $tmp = LAB_VAR . '/catalog.new.db';
    @unlink($tmp);
    $db = new SQLite3($tmp);
    $db->exec(<<<SQL
PRAGMA journal_mode = DELETE;
CREATE TABLE book (
  id INTEGER PRIMARY KEY,   -- 연구회 목록의 책 번호
  title TEXT NOT NULL,      -- 책이름
  author TEXT,              -- 지은이 (연구회 표기 그대로: 여러 사람과 역할이 한 칸에)
  publisher TEXT,           -- 출판사
  pub_year INTEGER,         -- 펴낸해
  pages TEXT,               -- 쪽수 (여러 권이면 글자가 섞여 TEXT)
  age TEXT,                 -- 연령 (예: 9세부터)
  genre TEXT,               -- 갈래 (예: 그림책)
  url TEXT                  -- 연구회 누리집의 이 책 소개 주소
);
CREATE TABLE person (
  person_id INTEGER PRIMARY KEY,  -- 사람 번호 (이 실습에서 붙인 것)
  name TEXT NOT NULL              -- 이름 (연구회 표기 그대로)
);
CREATE TABLE role (
  role TEXT PRIMARY KEY,   -- 역할 (글, 그림, 옮김 …)
  marc_code TEXT,          -- MARC 역할 부호 (aut, ill, trl …)
  meaning TEXT             -- 뜻
);
CREATE TABLE credit (
  book_id INTEGER REFERENCES book(id),
  person_id INTEGER REFERENCES person(person_id),
  role TEXT REFERENCES role(role),
  seq INTEGER,   -- 연구회 표기에서 몇 번째로 나왔는지
  raw TEXT,      -- 나누기 전 원래 표기
  PRIMARY KEY (book_id, person_id, role)
);
SQL);
    $db->exec('BEGIN');
    $ins = $db->prepare('INSERT INTO book VALUES (?,?,?,?,?,?,?,?,?)');
    foreach (csv_rows("$dataDir/books.csv") as $r) {
        foreach ($r as $i => $v) $ins->bindValue($i + 1, $v === '' ? null : ($i === 0 ? (int) $v : ($i === 4 && ctype_digit($v) ? (int) $v : $v)));
        $ins->execute(); $ins->reset();
    }
    $ins = $db->prepare('INSERT INTO person VALUES (?,?)');
    foreach (csv_rows("$dataDir/person.csv") as $r) { $ins->bindValue(1, (int) $r[0]); $ins->bindValue(2, $r[1]); $ins->execute(); $ins->reset(); }
    $ins = $db->prepare('INSERT INTO role VALUES (?,?,?)');
    foreach (csv_rows("$dataDir/role.csv") as $r) { foreach ($r as $i => $v) $ins->bindValue($i + 1, $v === '' ? null : $v); $ins->execute(); $ins->reset(); }
    $ins = $db->prepare('INSERT OR IGNORE INTO credit VALUES (?,?,?,?,?)');
    foreach (csv_rows("$dataDir/credit.csv") as $r) {
        $ins->bindValue(1, (int) $r[0]); $ins->bindValue(2, (int) $r[1]); $ins->bindValue(3, $r[2]); $ins->bindValue(4, (int) $r[3]); $ins->bindValue(5, $r[4]);
        $ins->execute(); $ins->reset();
    }
    $db->exec('COMMIT');
    $db->exec('CREATE INDEX credit_person ON credit(person_id); CREATE INDEX book_title ON book(title); ANALYZE;');
    $n = $db->querySingle('SELECT COUNT(*) FROM book') . '권, 사람 ' . $db->querySingle('SELECT COUNT(*) FROM person') . '명, 역할 기록 ' . $db->querySingle('SELECT COUNT(*) FROM credit') . '건';
    $db->close();
    rename($tmp, $catalog);
    echo "목록 DB를 만들었습니다: 책 $n\n";
}

// ---------- 함께 쓰는 DB ----------
$shared = LAB_VAR . '/shared.db';
if (!is_file($shared)) {
    $db = new SQLite3($shared);
    $db->exec(<<<SQL
PRAGMA journal_mode = WAL;
CREATE TABLE reading_log (
  id INTEGER PRIMARY KEY,   -- 기록 번호 (자동)
  book_id INTEGER,          -- 책 번호 (catalog의 book.id)
  student TEXT,             -- 넣은 사람 (서버가 채움)
  tag TEXT,                 -- 태그 한 낱말
  note TEXT,                -- 한 줄 생각
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
SQL);
    $db->close();
    echo "함께 쓰는 DB를 만들었습니다.\n";
}

labdb();   // 실습실 운영 DB(표가 없으면 만듦)

// ---------- C 아카이빙 보기 파일 ----------
// samples/ 의 보기 파일을 var/samples 로 복사하고, ffmpeg가 있으면 사진 두 장과 녹음으로 짧은 영상을 만듭니다.
$sampleSrc = realpath(__DIR__ . '/../samples');
if ($sampleSrc) {
    $n = 0;
    foreach (scandir($sampleSrc) as $f) {
        if ($f[0] === '.' || !is_file("$sampleSrc/$f")) continue;
        $to = LAB_VAR . "/samples/$f";
        if (!is_file($to) || filesize($to) !== filesize("$sampleSrc/$f")) { copy("$sampleSrc/$f", $to); $n++; }
    }
    if ($n) echo "보기 파일 {$n}개를 준비했습니다.
";
    $video = LAB_VAR . '/samples/library-tour.mp4';
    if (!is_file($video) && trim((string) shell_exec('command -v ffmpeg 2>/dev/null')) !== '') {
        $a = escapeshellarg("$sampleSrc/library-shelf.jpg"); $b = escapeshellarg("$sampleSrc/reading-room.png"); $w = escapeshellarg("$sampleSrc/book-talk.wav");
        $fit = 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p';
        $cmd = "ffmpeg -v error -y -loop 1 -t 10 -i $a -loop 1 -t 10 -i $b -i $w"
             . " -filter_complex \"[0:v]$fit,fade=t=out:st=9.5:d=0.5[v0];[1:v]$fit,fade=t=in:st=0:d=0.5[v1];[v0][v1]concat=n=2:v=1:a=0[v]\""
             . " -map \"[v]\" -map 2:a -c:v libx264 -preset veryfast -crf 26 -c:a aac -b:a 128k -t 20"
             . " -metadata title=" . escapeshellarg('도서관 둘러보기 (수업 연습용)') . " -metadata creation_time=2026-11-20T05:35:00Z"
             . " -metadata comment=" . escapeshellarg('메타데이터와아카이빙연구 실습용으로 만든 영상') . ' ' . escapeshellarg($video) . ' 2>&1';
        $out = shell_exec($cmd);
        echo is_file($video) && filesize($video) > 0 ? "보기 영상 library-tour.mp4를 만들었습니다.
" : "보기 영상을 만들지 못했습니다: " . trim((string) $out) . "
";
    }
}

// ---------- 수업 코드 ----------
function new_code(): string {
    $words = ['서가', '서고', '목록', '색인', '청구', '열람', '별치', '장서', '고서', '사서', '대출', '반납', '분류', '주제', '저록'];
    return $words[random_int(0, count($words) - 1)] . random_int(100, 999);
}
$s = settings();
if ($s['class_code'] === '' || in_array('--codes', $args, true)) {
    save_settings(['class_code' => new_code(), 'teacher_code' => bin2hex(random_bytes(4))]);
    $s = json_decode((string) file_get_contents(LAB_VAR . '/settings.json'), true);
    echo "수업 코드와 교수 코드를 새로 만들었습니다.\n";
}
echo "  학생 입장 코드: {$s['class_code']}\n  교수 코드:      {$s['teacher_code']}\n";
echo "  (코드를 바꾸려면: sudo -u www-data php " . realpath(__FILE__) . " --codes)\n";
