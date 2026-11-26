<?php
// C 실습(우리 반 아카이브): 받기, 확인, 기술 메타데이터, 이용본, 보존 기록(PREMIS식 사건), 더블린 코어, 내보내기.
declare(strict_types=1);
require_once __DIR__ . '/app.php';

// 확장자 → 그 확장자가 보통 뜻하는 형식 (확장자와 실제 형식이 맞는지 볼 때 씀)
const EXT_MIME = [
    'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp',
    'heic' => 'image/heic', 'heif' => 'image/heif', 'tif' => 'image/tiff', 'tiff' => 'image/tiff', 'bmp' => 'image/bmp',
    'wav' => 'audio/x-wav', 'mp3' => 'audio/mpeg', 'm4a' => 'audio/mp4', 'aac' => 'audio/aac', 'ogg' => 'audio/ogg', 'flac' => 'audio/flac', 'amr' => 'audio/amr', '3gp' => 'video/3gpp',
    'mp4' => 'video/mp4', 'mov' => 'video/quicktime', 'webm' => 'video/webm', 'avi' => 'video/x-msvideo', 'mkv' => 'video/x-matroska',
];
const DCMI_TYPE = ['image' => 'StillImage', 'audio' => 'Sound', 'video' => 'MovingImage'];
const RIGHTS = [
    'CC BY 4.0' => '저작자 표시 (CC BY 4.0): 누구나 쓰되 만든이를 밝힘',
    'CC BY-NC 4.0' => '저작자 표시, 비영리 (CC BY-NC 4.0)',
    'CC0 1.0' => '권리 포기 (CC0 1.0): 누구나 아무 조건 없이',
    '수업 안에서만' => '이 수업 안에서만 볼 수 있음 (모든 권리 보유)',
];
const DC_FIELDS = [
    'title' => ['제목', '자료의 이름. 무엇을 담았는지 알 수 있게.'],
    'creator' => ['만든이', '찍거나 녹음하거나 만든 사람이나 기관.'],
    'date' => ['날짜', '만든 날. YYYY-MM-DD 형식(ISO 8601).'],
    'subject' => ['주제어', '쉼표로 나눠 여러 개. 예: 도서관, 열람실'],
    'description' => ['설명', '무엇을, 왜, 어떻게 담았는지 두세 문장.'],
    'type' => ['유형', 'DCMI 유형 어휘. 서버가 형식을 보고 채움.'],
    'format' => ['형식', 'MIME 유형. 서버가 파일을 열어 보고 채움.'],
    'identifier' => ['식별자', '우리 아카이브 안에서 하나뿐인 번호. 서버가 붙임.'],
    'language' => ['언어', 'ISO 639 부호. 소리나 글이 없으면 zxx.'],
    'rights' => ['권리', '다른 사람이 이 자료를 어떻게 쓸 수 있는지.'],
    'relation' => ['관계', '이 자료와 관련된 권장도서(있으면).'],
    'coverage' => ['공간', '찍거나 녹음한 곳. 예: 전남대학교 중앙도서관'],
];

function arch_dir(int $id): string { return LAB_VAR . '/archive/' . $id; }
function backup_dir(int $id): string { return LAB_VAR . '/backup/' . $id; }
function item_ident(int $id): string { return 'class-lab:' . date('Y') . '-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT); }

function item(int $id): ?array {
    $r = q1('SELECT * FROM item WHERE id = ?', [$id]);
    if (!$r) return null;
    foreach (['tech', 'dc', 'access'] as $k) $r[$k] = $r[$k] ? (json_decode($r[$k], true) ?: []) : [];
    return $r;
}
function add_event(int $item, string $type, string $outcome, string $detail, string $agent = 'class-lab'): void {
    qexec('INSERT INTO event (item_id, at, type, outcome, detail, agent) VALUES (?,?,?,?,?,?)', [$item, now(), $type, $outcome, $detail, $agent]);
}
function events(int $item): array { return qall('SELECT * FROM event WHERE item_id = ? ORDER BY id', [$item]); }
function can_edit(array $u, array $it): bool { return !empty($u['teacher']) || $u['id'] === $it['owner']; }

function has_tool(string $t): bool {
    static $c = [];
    if (!isset($c[$t])) $c[$t] = PHP_OS_FAMILY !== 'Windows' && trim((string) shell_exec('command -v ' . escapeshellarg($t) . ' 2>/dev/null')) !== '';
    return $c[$t];
}
function kind_of(string $mime): string {
    foreach (['image', 'audio', 'video'] as $k) if (strpos($mime, "$k/") === 0) return $k;
    if (in_array($mime, ['application/ogg'], true)) return 'audio';
    return 'other';
}

/** 받기: 올라온 파일을 원본과 사본 두 곳에 두고, 체크섬과 형식을 기록합니다. [자료 번호, 오류] */
function ingest(array $u, array $file, string $clientSha, bool $sample = false): array {
    if (($file['error'] ?? 1) !== UPLOAD_ERR_OK) return [0, '파일을 받지 못했습니다(너무 크거나 연결이 끊김). 파일 하나는 ' . fmt_bytes(ARCHIVE_FILE_MAX) . '까지입니다.'];
    if ($file['size'] > ARCHIVE_FILE_MAX) return [0, '파일 하나는 ' . fmt_bytes(ARCHIVE_FILE_MAX) . '까지입니다.'];
    $n = (int) q1('SELECT COUNT(*) AS n FROM item WHERE owner = ?', [$u['id']])['n'];
    if (empty($u['teacher']) && $n >= ARCHIVE_PER_STUDENT) return [0, '한 사람이 ' . ARCHIVE_PER_STUDENT . '건까지 넣을 수 있습니다. 연습한 자료를 지우고 다시 하세요.'];
    $orig = (string) $file['name'];
    $mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $kind = kind_of($mime);
    if ($kind === 'other' && !in_array(ext_of_name($orig), ['heic', 'heif'], true)) {
        return [0, "이 실습은 사진, 소리, 영상만 받습니다. 서버가 파일 속을 보니 '$mime' 형식이었습니다."];
    }
    if ($kind === 'other') { $kind = 'image'; }
    $ext = ext_of_name($orig) ?: (array_search($mime, EXT_MIME, true) ?: 'bin');
    if (!preg_match('/^[a-z0-9]{1,5}$/', $ext)) $ext = 'bin';
    qexec('INSERT INTO item (owner, created_at, orig_name, size, mime, ext, kind, status, is_sample) VALUES (?,?,?,?,?,?,?,?,?)',
        [$u['id'], now(), $orig, (int) $file['size'], $mime, $ext, $kind, 'queued', $sample ? 1 : 0]);
    $id = labdb()->lastInsertRowID();
    $dir = arch_dir($id);
    mkdir($dir, 0775, true);
    $stored = "original.$ext";
    $ok = is_uploaded_file($file['tmp_name']) ? move_uploaded_file($file['tmp_name'], "$dir/$stored") : copy($file['tmp_name'], "$dir/$stored");
    if (!$ok) { qexec('DELETE FROM item WHERE id = ?', [$id]); return [0, '서버에 저장하지 못했습니다.']; }
    add_event($id, '받음 (ingestion)', '성공', "원래 이름 '$orig', " . number_format((int) $file['size']) . ' 바이트를 받아 ' . "archive/$id/$stored 로 저장", $u['id']);
    $sha = hash_file('sha256', "$dir/$stored");
    add_event($id, '체크섬 계산 (message digest calculation)', '성공', "SHA-256 $sha");
    if ($clientSha !== '') {
        $same = hash_equals(strtolower($clientSha), $sha);
        add_event($id, '전송 고정성 확인 (fixity check)', $same ? '일치' : '불일치',
            $same ? '내 컴퓨터에서 잰 SHA-256과 서버가 받은 파일의 SHA-256이 같습니다. 오는 길에 한 비트도 바뀌지 않았습니다.'
                  : "내 컴퓨터에서 잰 값 $clientSha 와 서버 값이 다릅니다. 다시 올려 보세요.");
    }
    $expect = EXT_MIME[$ext] ?? null;
    $match = $expect === null ? null : (explode('/', $expect)[1] === explode('/', $mime)[1] || ($expect === 'audio/x-wav' && strpos($mime, 'wav') !== false));
    add_event($id, '형식 식별 (format identification)', $match === false ? '경고' : '성공',
        "파일 속을 읽어 본 형식: $mime" . ($match === false ? ". 확장자 .$ext 은(는) 보통 $expect 인데 실제 형식과 다릅니다. 이름만 바꾼 파일일 수 있습니다." : ($expect ? ", 확장자 .$ext 와 맞음" : ", 확장자 .$ext 은(는) 이 실습실이 모르는 것")));
    mkdir(backup_dir($id), 0775, true);
    copy("$dir/$stored", backup_dir($id) . "/$stored");
    add_event($id, '사본 만들기 (replication)', '성공', "backup/$id/$stored 에 두 번째 벌을 둠");
    $title = preg_replace('/\.[^.]+$/', '', $orig);
    $dc = ['title' => '', 'creator' => $u['name'], 'date' => '', 'subject' => '', 'description' => '', 'type' => DCMI_TYPE[$kind] ?? '',
        'format' => $mime, 'identifier' => item_ident($id), 'language' => $kind === 'image' ? 'zxx' : 'kor', 'rights' => '', 'relation' => '', 'coverage' => '', '_suggest_title' => $title];
    qexec('UPDATE item SET stored = ?, sha256 = ?, client_sha256 = ?, dc = ? WHERE id = ?', [$stored, $sha, $clientSha, json_encode($dc, JSON_UNESCAPED_UNICODE), $id]);
    start_job($id);
    return [$id, ''];
}
function ext_of_name(string $n): string { $p = strrpos($n, '.'); return $p === false ? '' : strtolower(substr($n, $p + 1)); }

/** 뒤에서 처리(기술 메타데이터 추출, 이용본 만들기)를 시작합니다. */
function start_job(int $id): void {
    $script = __DIR__ . '/archive-job.php';
    if (PHP_OS_FAMILY === 'Windows') {
        // 노트북 시험용: 바로 처리합니다(ffmpeg가 없으면 '도구 없음'으로 끝남).
        exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . $id);
        return;
    }
    $cmd = 'CLASS_LAB_VAR=' . escapeshellarg(LAB_VAR) . ' nohup nice -n 10 ' . escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . (int) $id . ' > /dev/null 2>&1 &';
    exec($cmd);
}

/** 고정성 검사: 원본과 사본을 다시 재어 받을 때의 값과 견줍니다. */
function fixity_check(array $it, string $who): array {
    $id = (int) $it['id'];
    $res = [];
    foreach (['원본' => arch_dir($id), '사본' => backup_dir($id)] as $label => $d) {
        $f = "$d/{$it['stored']}";
        $now = is_file($f) ? hash_file('sha256', $f) : '(파일 없음)';
        $res[$label] = ['sha' => $now, 'ok' => $now === $it['sha256']];
    }
    $ok = $res['원본']['ok'] && $res['사본']['ok'];
    add_event($id, '고정성 검사 (fixity check)', $ok ? '일치' : '불일치',
        '원본 ' . ($res['원본']['ok'] ? '일치' : '불일치 ' . $res['원본']['sha']) . ', 사본 ' . ($res['사본']['ok'] ? '일치' : '불일치 ' . $res['사본']['sha']), $who);
    return $res;
}

/** 연습: 원본의 가운데 한 바이트에서 비트 하나를 뒤집습니다(비트 썩음 흉내). */
function flip_bit(array $it, string $who): void {
    $f = arch_dir((int) $it['id']) . "/{$it['stored']}";
    $h = fopen($f, 'r+b'); $pos = (int) (filesize($f) / 2);
    fseek($h, $pos); $b = ord(fread($h, 1)); fseek($h, $pos); fwrite($h, chr($b ^ 1)); fclose($h);
    add_event((int) $it['id'], '손상 연습 (비트 하나 바꾸기)', '실행', "원본의 $pos 번째 바이트에서 비트 하나를 뒤집음(연습)", $who);
}

/** 되살리기: 사본이 맞으면 사본으로 원본을 덮습니다. */
function repair(array $it, string $who): bool {
    $id = (int) $it['id'];
    $b = backup_dir($id) . "/{$it['stored']}";
    if (!is_file($b) || hash_file('sha256', $b) !== $it['sha256']) { add_event($id, '되살리기 (replacement)', '실패', '사본도 맞지 않아 되살릴 수 없음', $who); return false; }
    copy($b, arch_dir($id) . "/{$it['stored']}");
    add_event($id, '되살리기 (replacement)', '성공', '체크섬이 맞는 사본으로 원본을 바꿈', $who);
    return true;
}

function delete_item(int $id): void {
    foreach ([arch_dir($id), backup_dir($id)] as $d) {
        if (!is_dir($d)) continue;
        foreach (scandir($d) as $f) if ($f !== '.' && $f !== '..') @unlink("$d/$f");
        @rmdir($d);
    }
    qexec('DELETE FROM event WHERE item_id = ?', [$id]);
    qexec('DELETE FROM item WHERE id = ?', [$id]);
}

// ---------- 내보내기 ----------
function relation_book(array $dc): ?array {
    if (!preg_match('/^book:(\d+)$/', (string) ($dc['relation'] ?? ''), $m)) return null;
    $db = new SQLite3(LAB_VAR . '/catalog.db', SQLITE3_OPEN_READONLY);
    $st = $db->prepare('SELECT id, title, author, publisher, url FROM book WHERE id = ?');
    $st->bindValue(1, (int) $m[1]);
    return $st->execute()->fetchArray(SQLITE3_ASSOC) ?: null;
}

function dc_xml(array $it): string {
    $dc = $it['dc']; $x = fn($s) => htmlspecialchars((string) $s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    $lines = [];
    foreach (['title', 'creator'] as $k) if (($dc[$k] ?? '') !== '') $lines[] = "  <dc:$k>" . $x($dc[$k]) . "</dc:$k>";
    foreach (array_filter(array_map('trim', explode(',', (string) ($dc['subject'] ?? '')))) as $s) $lines[] = '  <dc:subject>' . $x($s) . '</dc:subject>';
    foreach (['description', 'date'] as $k) if (($dc[$k] ?? '') !== '') $lines[] = "  <dc:$k>" . $x($dc[$k]) . "</dc:$k>";
    $lines[] = '  <dc:type>' . $x($dc['type'] ?? '') . '</dc:type>';
    $lines[] = '  <dc:format>' . $x($it['mime']) . '</dc:format>';
    $lines[] = '  <dc:identifier>' . $x($dc['identifier'] ?? item_ident((int) $it['id'])) . '</dc:identifier>';
    if (($dc['language'] ?? '') !== '') $lines[] = '  <dc:language>' . $x($dc['language']) . '</dc:language>';
    if ($b = relation_book($dc)) $lines[] = '  <dc:relation>' . $x($b['url'] ?: $b['title']) . '</dc:relation><!-- ' . $x($b['title']) . ' -->';
    if (($dc['coverage'] ?? '') !== '') $lines[] = '  <dc:coverage>' . $x($dc['coverage']) . '</dc:coverage>';
    if (($dc['rights'] ?? '') !== '') $lines[] = '  <dc:rights>' . $x($dc['rights']) . '</dc:rights>';
    $lines[] = '  <dc:publisher>전남대학교 문헌정보학과 메타데이터와아카이빙연구 수업 아카이브</dc:publisher>';
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<oai_dc:dc xmlns:oai_dc=\"http://www.openarchives.org/OAI/2.0/oai_dc/\"\n  xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n  xsi:schemaLocation=\"http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd\">\n" . implode("\n", $lines) . "\n</oai_dc:dc>\n";
}

function item_json(array $it): array {
    $dc = $it['dc']; unset($dc['_suggest_title']);
    return [
        'identifier' => $dc['identifier'] ?? item_ident((int) $it['id']),
        'descriptive' => $dc,
        'related_book' => relation_book($it['dc']),
        'technical' => $it['tech'],
        'preservation' => ['original_name' => $it['orig_name'], 'stored' => "archive/{$it['id']}/{$it['stored']}", 'size' => (int) $it['size'],
            'sha256' => $it['sha256'], 'format' => $it['mime'], 'copies' => 2,
            'events' => array_map(fn($e) => ['date' => $e['at'], 'type' => $e['type'], 'outcome' => $e['outcome'], 'detail' => $e['detail'], 'agent' => $e['agent']], events((int) $it['id']))],
        'access_copies' => $it['access'],
    ];
}

/** BagIt 꾸러미(zip): 원본과 메타데이터, 체크섬 목록을 함께 묶습니다. */
function make_bag(array $it): string {
    $id = (int) $it['id'];
    $name = 'bag-' . str_replace(':', '-', $it['dc']['identifier'] ?? "item-$id");
    $zipf = LAB_VAR . "/tmp/$name-" . bin2hex(random_bytes(3)) . '.zip';
    $files = [
        "data/{$it['stored']}" => ['file', arch_dir($id) . "/{$it['stored']}"],
        'data/metadata/dc.xml' => ['text', dc_xml($it)],
        'data/metadata/item.json' => ['text', json_encode(item_json($it), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n"],
    ];
    $manifest = ''; $oxBytes = 0; $oxCount = 0;
    foreach ($files as $path => [$t, $v]) {
        $sha = $t === 'file' ? hash_file('sha256', $v) : hash('sha256', $v);
        $manifest .= "$sha  $path\n";
        $oxBytes += $t === 'file' ? filesize($v) : strlen($v); $oxCount++;
    }
    $tags = [
        'bagit.txt' => "BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n",
        'bag-info.txt' => "Source-Organization: 전남대학교 문헌정보학과 메타데이터와아카이빙연구\nExternal-Identifier: " . ($it['dc']['identifier'] ?? '') .
            "\nExternal-Description: " . str_replace("\n", ' ', (string) ($it['dc']['title'] ?? '')) . "\nBagging-Date: " . date('Y-m-d') . "\nPayload-Oxum: $oxBytes.$oxCount\n",
        'manifest-sha256.txt' => $manifest,
    ];
    $tm = '';
    foreach ($tags as $p => $v) $tm .= hash('sha256', $v) . "  $p\n";
    $tags['tagmanifest-sha256.txt'] = $tm;
    $z = new ZipArchive();
    $z->open($zipf, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    foreach ($tags as $p => $v) $z->addFromString("$name/$p", $v);
    foreach ($files as $p => [$t, $v]) { if ($t === 'file') $z->addFile($v, "$name/$p"); else $z->addFromString("$name/$p", $v); }
    $z->close();
    return $zipf;
}
