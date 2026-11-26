<?php
// 아카이브 자료 하나를 뒤에서 처리합니다: 기술 메타데이터 추출(exiftool, ffprobe)과 이용본 만들기(ffmpeg).
// 실습실이 자료를 받은 뒤 스스로 띄웁니다. 한 번에 하나씩만 돌도록 잠금(job.lock)을 씁니다.
// 손으로 다시 돌리려면: sudo -u www-data php /srv/class-lab/lib/archive-job.php 자료번호
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit;
require __DIR__ . '/archive.php';

$id = (int) ($argv[1] ?? 0);
$it = item($id);
if (!$it) exit("자료 $id 이(가) 없습니다.\n");

$lock = fopen(LAB_VAR . '/job.lock', 'c');
flock($lock, LOCK_EX);   // 앞의 처리가 끝날 때까지 기다립니다
qexec("UPDATE item SET status = 'processing' WHERE id = ?", [$id]);

$dir = arch_dir($id);
$orig = "$dir/{$it['stored']}";
$T = 'timeout 300 ';
$sh = fn(string $c) => shell_exec($c . ' 2>&1');
$problems = [];

// ---------- 1. 기술 메타데이터 ----------
$exif = []; $probe = [];
if (has_tool('exiftool')) {
    $j = json_decode((string) $sh($T . 'exiftool -json -n -G1 ' . escapeshellarg($orig)), true);
    $exif = is_array($j) && isset($j[0]) ? $j[0] : [];
    unset($exif['SourceFile'], $exif['System:Directory'], $exif['System:FilePermissions']);
}
if (has_tool('ffprobe')) {
    $probe = json_decode((string) $sh($T . 'ffprobe -v error -print_format json -show_format -show_streams ' . escapeshellarg($orig)), true) ?: [];
}
$pick = function (array $keys) use ($exif) {
    foreach ($keys as $k) foreach ($exif as $ek => $v) if ($ek === $k || preg_match('/:' . preg_quote($k, '/') . '$/', $ek)) return $v;
    return null;
};
$v = null; $a = null;
foreach (($probe['streams'] ?? []) as $s) {
    if (($s['codec_type'] ?? '') === 'video' && !$v && empty($s['disposition']['attached_pic'])) $v = $s;
    if (($s['codec_type'] ?? '') === 'audio' && !$a) $a = $s;
}
$fmt = $probe['format'] ?? [];
$sum = array_filter([
    '너비(px)' => $v['width'] ?? $pick(['ImageWidth']),
    '높이(px)' => $v['height'] ?? $pick(['ImageHeight']),
    '길이(초)' => isset($fmt['duration']) && $it['kind'] !== 'image' ? round((float) $fmt['duration'], 2) : null,
    '컨테이너' => $fmt['format_long_name'] ?? null,
    '영상 코덱' => $it['kind'] === 'video' && $v ? ($v['codec_long_name'] ?? $v['codec_name'] ?? null) : null,
    '초당 프레임' => $it['kind'] === 'video' && $v && !empty($v['avg_frame_rate']) && $v['avg_frame_rate'] !== '0/0' ? round(eval_rate($v['avg_frame_rate']), 2) : null,
    '소리 코덱' => $a['codec_long_name'] ?? $a['codec_name'] ?? null,
    '표본 추출률(Hz)' => $a['sample_rate'] ?? null,
    '채널' => $a['channels'] ?? null,
    '비트 깊이' => $a['bits_per_sample'] ?? ($a['bits_per_raw_sample'] ?? null) ?: null,
    '비트레이트(kbps)' => isset($fmt['bit_rate']) ? round((int) $fmt['bit_rate'] / 1000) : null,
    '압축' => $it['kind'] === 'image' ? $pick(['Compression']) : null,
    '색 공간' => $pick(['ColorSpace', 'ColorType']),
    '카메라 제조사' => $pick(['Make']),
    '카메라 모델' => $pick(['Model']),
    '촬영(만든) 때' => $pick(['DateTimeOriginal', 'CreateDate']) ?? ($fmt['tags']['creation_time'] ?? null),
    '방향(Orientation)' => $pick(['Orientation']),
    '회전' => $v['tags']['rotate'] ?? null,
    '소프트웨어' => $pick(['Software']),
    '위도' => $pick(['GPSLatitude']),
    '경도' => $pick(['GPSLongitude']),
], fn($x) => $x !== null && $x !== '');
$tools = [];
if ($exif) $tools[] = 'exiftool ' . ($pick(['ExifToolVersion']) ?? '');
if ($probe) $tools[] = 'ffprobe';
$tech = ['summary' => $sum, 'exiftool' => array_slice($exif, 0, 250, true), 'ffprobe' => $probe];
if ($tools) add_event($id, '기술 메타데이터 추출 (metadata extraction)', '성공', '도구: ' . implode(', ', $tools) . '. 뽑은 항목 ' . count($sum) . '개');
else { add_event($id, '기술 메타데이터 추출 (metadata extraction)', '실패', '이 서버에 exiftool과 ffprobe가 없습니다.'); $problems[] = '기술 메타데이터 도구가 없습니다.'; }
$gps = isset($sum['위도'], $sum['경도']);
if ($gps) add_event($id, '개인정보 확인', '경고', "원본에 촬영 위치(위도 {$sum['위도']}, 경도 {$sum['경도']})가 들어 있습니다. 이용본에서는 지웁니다. 원본은 소유자와 교수만 내려받습니다.");

function eval_rate(string $r): float { $p = explode('/', $r); return count($p) === 2 && (float) $p[1] ? (float) $p[0] / (float) $p[1] : (float) $r; }

// ---------- 2. 이용본 ----------
$access = [];
if (!has_tool('ffmpeg')) {
    add_event($id, '이용본 만들기 (migration)', '실패', '이 서버에 ffmpeg가 없습니다.');
    $problems[] = '이용본을 만들 도구(ffmpeg)가 없습니다.';
} else {
    $F = $T . 'ffmpeg -v error -y ';
    $src = $orig;
    if ($it['kind'] === 'image' && in_array($it['ext'], ['heic', 'heif'], true) || $it['mime'] === 'image/heic') {
        if (has_tool('heif-convert')) { $sh($T . 'heif-convert ' . escapeshellarg($orig) . ' ' . escapeshellarg("$dir/heic.jpg")); if (is_file("$dir/heic.jpg")) $src = "$dir/heic.jpg"; }
    }
    if ($it['kind'] === 'image') {
        $rot = ['3' => 'hflip,vflip,', '6' => 'transpose=1,', '8' => 'transpose=2,'][(string) ($sum['방향(Orientation)'] ?? '')] ?? '';
        $e1 = $sh($F . '-i ' . escapeshellarg($src) . " -vf \"{$rot}scale='min(1600,iw)':-2\" -map_metadata -1 -frames:v 1 -q:v 3 " . escapeshellarg("$dir/access.jpg"));
        $sh($F . '-i ' . escapeshellarg($src) . " -vf \"{$rot}scale='min(480,iw)':-2\" -map_metadata -1 -frames:v 1 -q:v 5 " . escapeshellarg("$dir/thumb.jpg"));
        if (is_file("$dir/access.jpg") && filesize("$dir/access.jpg") > 0) {
            $access = ['view' => 'access.jpg', 'thumb' => 'thumb.jpg'];
            add_event($id, '이용본 만들기 (migration)', '성공', '긴 변 1600px 이하 JPEG 이용본과 480px 썸네일. 촬영 정보와 위치 정보는 넣지 않음');
        } else {
            $why = trim((string) $e1);
            add_event($id, '이용본 만들기 (migration)', '실패', 'ffmpeg가 이 파일을 그림으로 읽지 못했습니다. 파일이 깨졌거나 이 서버가 모르는 형식입니다. ' . mb_substr($why, 0, 300));
            $problems[] = '이용본을 만들지 못했습니다(파일이 깨졌거나 읽을 수 없는 형식).';
        }
        @unlink("$dir/heic.jpg");
    } elseif ($it['kind'] === 'audio') {
        $e1 = $sh($F . '-i ' . escapeshellarg($orig) . ' -vn -ac 2 -ar 44100 -b:a 128k -t 600 -map_metadata -1 ' . escapeshellarg("$dir/access.mp3"));
        $sh($F . '-i ' . escapeshellarg($orig) . ' -filter_complex "aformat=channel_layouts=mono,showwavespic=s=960x240:colors=#1f3a5f" -frames:v 1 ' . escapeshellarg("$dir/thumb.png"));
        if (is_file("$dir/access.mp3") && filesize("$dir/access.mp3") > 0) {
            $access = ['play' => 'access.mp3', 'thumb' => is_file("$dir/thumb.png") ? 'thumb.png' : null];
            add_event($id, '이용본 만들기 (migration)', '성공', 'MP3 128kbps 이용본(최대 10분)과 파형 그림. 원본 ' . fmt_bytes($it['size']) . ' → 이용본 ' . fmt_bytes(filesize("$dir/access.mp3")));
        } else { add_event($id, '이용본 만들기 (migration)', '실패', mb_substr(trim((string) $e1), 0, 300)); $problems[] = '소리 이용본을 만들지 못했습니다.'; }
    } elseif ($it['kind'] === 'video') {
        $dur = (float) ($fmt['duration'] ?? 0);
        $e1 = $sh($F . '-i ' . escapeshellarg($orig) . " -t 60 -vf \"scale=-2:'min(480,ih)'\" -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 96k -ac 2 -movflags +faststart -map_metadata -1 " . escapeshellarg("$dir/access.mp4"));
        $sh($F . '-ss ' . ($dur > 2 ? '1' : '0') . ' -i ' . escapeshellarg($orig) . " -frames:v 1 -vf \"scale=480:-2\" " . escapeshellarg("$dir/thumb.jpg"));
        if (is_file("$dir/access.mp4") && filesize("$dir/access.mp4") > 0) {
            $access = ['play' => 'access.mp4', 'thumb' => is_file("$dir/thumb.jpg") ? 'thumb.jpg' : null];
            add_event($id, '이용본 만들기 (migration)', '성공', 'H.264, AAC, MP4 이용본(세로 480px 이하' . ($dur > 60 ? ', 앞 60초만' : '') . ')과 포스터 그림. 원본 ' . fmt_bytes($it['size']) . ' → 이용본 ' . fmt_bytes(filesize("$dir/access.mp4")));
        } else { add_event($id, '이용본 만들기 (migration)', '실패', mb_substr(trim((string) $e1), 0, 300)); $problems[] = '영상 이용본을 만들지 못했습니다.'; }
    }
    if ($gps && $access) add_event($id, '위치 정보 지움', '성공', '이용본에는 촬영 위치를 넣지 않았습니다.');
}

qexec("UPDATE item SET tech = ?, access = ?, status = 'done', error = ? WHERE id = ?",
    [json_encode($tech, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR), json_encode($access), $problems ? implode(' ', $problems) : null, $id]);
flock($lock, LOCK_UN);
echo "자료 $id 처리 끝" . ($problems ? ': ' . implode(' ', $problems) : '') . "\n";
