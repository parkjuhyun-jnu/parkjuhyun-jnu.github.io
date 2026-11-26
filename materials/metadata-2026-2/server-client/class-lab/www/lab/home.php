<?php
// A 실습: 내 홈페이지. 서버의 내 폴더(var/sites/<아이디>/)를 브라우저에서 다룹니다.
require __DIR__ . '/../../lib/sites.php';
$u = require_login();
if ($u['teacher']) { header('Location: teacher.php'); exit; }
$id = $u['id'];
ensure_site($id, $u['name']);
$root = site_dir($id);
$dir = clean_rel((string) ($_GET['dir'] ?? $_POST['dir'] ?? '')) ?? '';
$here = $dir === '' ? $root : "$root/$dir";
if (!is_dir($here)) { $dir = ''; $here = $root; }
$flash = []; $warn = [];

function back(string $dir, string $extra = ''): void {
    header('Location: home.php?' . http_build_query(array_filter(['dir' => $dir])) . $extra); exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $act = $_POST['act'] ?? '';
    $used = site_usage($id);
    if ($act === 'upload' && !empty($_FILES['files'])) {
        $f = $_FILES['files'];
        for ($i = 0; $i < count($f['name']); $i++) {
            $name = basename((string) $f['name'][$i]);
            if ($f['error'][$i] !== UPLOAD_ERR_OK) { $warn[] = "$name: 올리지 못했습니다(파일이 너무 크거나 끊김)."; continue; }
            if (!valid_name($name)) { $warn[] = "$name: 이름에 한글, 띄어쓰기, 괄호 같은 글자가 있습니다. 영문, 숫자, 점(.), 밑줄(_), 붙임표(-)로 이름을 바꿔 다시 올리세요. 주소에 그대로 쓰일 이름이기 때문입니다."; continue; }
            $ext = ext_of($name);
            if (!isset(SITE_TYPES[$ext])) { $warn[] = "$name: 이 실습에서는 웹 페이지, 그림, 소리, 영상, 문서(pdf), 데이터(csv, json, xml) 파일만 올립니다."; continue; }
            if ($f['size'][$i] > SITE_FILE_MAX) { $warn[] = "$name: 파일 하나는 " . fmt_bytes(SITE_FILE_MAX) . "까지입니다."; continue; }
            if ($used + $f['size'][$i] > SITE_QUOTA) { $warn[] = "$name: 내 폴더가 " . fmt_bytes(SITE_QUOTA) . "를 넘습니다. 쓰지 않는 파일을 지우세요."; continue; }
            $existed = is_file("$here/$name");
            move_uploaded_file($f['tmp_name'][$i], "$here/$name");
            $used += $f['size'][$i];
            $flash[] = "{$name}을(를) 서버에 " . ($existed ? '덮어썼습니다' : '올렸습니다') . ' (' . fmt_bytes($f['size'][$i]) . ').';
        }
    } elseif ($act === 'save') {
        $name = (string) ($_POST['name'] ?? '');
        $text = str_replace("\r\n", "\n", (string) ($_POST['text'] ?? ''));
        if (!valid_name($name) || !in_array(ext_of($name), SITE_TEXT, true)) $warn[] = '글자 파일(html, css, js, txt, csv, json, xml, md, svg)만 여기서 고칠 수 있습니다.';
        elseif ($used + strlen($text) > SITE_QUOTA) $warn[] = '내 폴더가 가득 찼습니다.';
        else {
            file_put_contents("$here/$name", $text);
            $_SESSION['flash'] = ["{$name}을(를) 서버에 저장했습니다. 주소를 새로고침해 보세요."];
            back($dir, '&edit=' . rawurlencode($name));
        }
    } elseif ($act === 'new') {
        $name = trim((string) ($_POST['name'] ?? ''));
        if (!valid_name($name) || !in_array(ext_of($name), SITE_TEXT, true)) $warn[] = '새 파일 이름은 영문으로, 끝에 .html, .css, .txt, .json 같은 확장자를 붙여 주세요.';
        elseif (file_exists("$here/$name")) $warn[] = "{$name}은(는) 이미 있습니다.";
        else { file_put_contents("$here/$name", ''); back($dir, '&edit=' . rawurlencode($name)); }
    } elseif ($act === 'mkdir') {
        $name = trim((string) ($_POST['name'] ?? ''));
        if (!valid_name($name) || strpos($name, '.') !== false) $warn[] = '폴더 이름은 영문, 숫자, 밑줄, 붙임표로 지어 주세요(점 없이).';
        elseif (substr_count($dir, '/') >= 2) $warn[] = '폴더는 세 겹까지만 만듭니다.';
        elseif (file_exists("$here/$name")) $warn[] = "{$name}은(는) 이미 있습니다.";
        else { mkdir("$here/$name"); $flash[] = "폴더 {$name}을(를) 만들었습니다. 주소는 /u/$id/" . ($dir ? "$dir/" : '') . "$name/ 입니다."; }
    } elseif ($act === 'rename') {
        $from = (string) ($_POST['from'] ?? ''); $to = trim((string) ($_POST['to'] ?? ''));
        if (!valid_name($from) || !file_exists("$here/$from")) $warn[] = '바꿀 파일이 없습니다.';
        elseif (!valid_name($to)) $warn[] = '새 이름은 영문, 숫자, 점, 밑줄, 붙임표로 지어 주세요.';
        elseif (file_exists("$here/$to")) $warn[] = "{$to}은(는) 이미 있습니다.";
        elseif (is_file("$here/$from") && !isset(SITE_TYPES[ext_of($to)])) $warn[] = '쓸 수 있는 확장자가 아닙니다.';
        else { rename("$here/$from", "$here/$to"); $flash[] = "$from → $to 로 이름을 바꿨습니다. 옛 주소는 이제 404가 됩니다."; }
    } elseif ($act === 'delete') {
        $name = (string) ($_POST['name'] ?? '');
        if (valid_name($name) && file_exists("$here/$name")) { rrmdir("$here/$name"); $flash[] = "{$name}을(를) 서버에서 지웠습니다."; }
    } elseif ($act === 'books') {
        // 책 소개 페이지 만들기: 고른 책의 서지 사항으로 books.html과 books.json을 만듭니다.
        $ids = array_slice(array_filter(array_map('intval', (array) ($_POST['book'] ?? []))), 0, 5);
        if (!$ids) $warn[] = '책을 한 권 이상 골라 주세요.';
        else {
            $cat = new SQLite3(LAB_VAR . '/catalog.db', SQLITE3_OPEN_READONLY);
            $books = [];
            foreach ($ids as $bid) {
                $st = $cat->prepare('SELECT id, title, author, publisher, pub_year, age, genre, url FROM book WHERE id = ?');
                $st->bindValue(1, $bid); $r = $st->execute()->fetchArray(SQLITE3_ASSOC);
                if ($r) $books[] = $r;
            }
            $li = '';
            foreach ($books as $b) {
                $li .= "    <li>\n      <b>" . h($b['title']) . "</b><br>\n      " . h($b['author']) . ', ' . h($b['publisher']) . ', ' . h($b['pub_year']) . "<br>\n"
                    . '      <small>' . h($b['age']) . ', ' . h($b['genre']) . '</small> <a href="' . h($b['url']) . "\">연구회 소개</a>\n    </li>\n";
            }
            $title = h($u['name']) . '이(가) 고른 권장도서';
            $html = "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>$title</title>\n<link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <h1>$title</h1>\n  <p>(사)어린이도서연구회 권장도서 목록에서 골랐습니다.</p>\n  <ol>\n$li  </ol>\n  <p><a href=\"books.json\">같은 목록을 JSON으로 보기</a> | <a href=\"./\">처음으로</a></p>\n</body>\n</html>\n";
            file_put_contents("$root/books.html", $html);
            file_put_contents("$root/books.json", json_encode(['made_by' => $u['name'], 'source' => '(사)어린이도서연구회 추천 목록', 'books' => $books], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
            if (!is_file("$root/style.css")) file_put_contents("$root/style.css", "body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }\nh1 { color: #1f3a5f; }\nli { margin: .8rem 0; }\n");
            $_SESSION['flash'] = ['books.html, books.json, style.css를 내 폴더에 만들었습니다. 아래 표에서 주소를 눌러 열어 보세요.'];
            back('');
        }
    }
    if ($flash || $warn) { $_SESSION['flash'] = $flash; $_SESSION['warn'] = $warn; back($dir); }
}
$flash = $_SESSION['flash'] ?? []; $warn = $_SESSION['warn'] ?? [];
unset($_SESSION['flash'], $_SESSION['warn']);

$files = list_site($id, $dir);
$urlBase = "/u/$id/" . ($dir === '' ? '' : "$dir/");
$base = server_base();
$edit = (string) ($_GET['edit'] ?? '');
$editText = null;
if ($edit !== '' && valid_name($edit) && is_file("$here/$edit") && in_array(ext_of($edit), SITE_TEXT, true)) $editText = (string) file_get_contents("$here/$edit");
$peek = (string) ($_GET['peek'] ?? '');
$peekRes = null;
if ($peek !== '') {
    $p = '/' . ltrim($peek, '/');
    $peekRes = site_response($id, $p);
}
$visits = qall('SELECT path, status, bytes, ip, agent, at FROM visit WHERE site = ? ORDER BY id DESC LIMIT 30', [$id]);
$used = site_usage($id);

// 실습 순서와 저절로 매겨지는 확인 표시 (서버의 방문 기록과 파일을 보고 판단합니다)
$v = fn(string $where, array $p = []) => (int) (q1("SELECT COUNT(*) AS n FROM visit WHERE site = ? AND $where", array_merge([$id], $p))['n'] ?? 0);
$idx = is_file("$root/index.html") ? (string) file_get_contents("$root/index.html") : '';
$others = array_filter(list_site($id, ''), fn($f) => !in_array($f['name'], ['index.html', 'books.html', 'books.json', 'style.css'], true));
$tasks = [
    ['내 주소를 열어 보기', '아래 [내 주소]를 눌러 새 탭에서 엽니다. 서버가 내 폴더의 index.html을 보내 줍니다.', $v("status = 200 AND path IN (?, ?)", ["/u/$id/", "/u/$id/index.html"]) > 0],
    ['index.html 고쳐 저장하기', '표에서 index.html의 [고치기]를 누르고 글을 바꿔 [서버에 저장] → 열어 둔 탭을 새로고침합니다.', $idx !== '' && strpos($idx, '이 화면을 새로고침해 보세요') === false],
    ['책 소개 페이지 만들기', '아래 [책 소개 페이지 만들기]에서 권장도서를 골라 books.html을 만들고, books.json도 열어 봅니다.', is_file("$root/books.html")],
    ['내 컴퓨터의 파일 올리기', '사진이나 CSV 파일을 [파일 올리기]로 올리고 주소로 엽니다. 이름은 영문으로 짓습니다.', count($others) > 0],
    ['폰으로 열어 보기', '아래 QR을 폰 카메라로 찍어 내 주소를 엽니다. 방문 기록에 폰이 찍힙니다.', $v("(agent LIKE '%Mobile%' OR agent LIKE '%Android%' OR agent LIKE '%iPhone%')") > 0],
    ['없는 주소를 열어 404 보기', "주소 끝에 없는 파일 이름(예: /u/$id/nothing.html)을 붙여 엽니다.", $v('status = 404') > 0],
    ['하위 폴더 안의 파일 열기', '[새 폴더]를 만들고 그 안에 파일을 넣은 뒤 /u/아이디/폴더/파일 주소로 엽니다.', $v("status = 200 AND path LIKE ?", ["/u/$id/%/%_"]) > 0],
];

page_head('A 내 홈페이지', $u, 'home.php');
?>
  <span class="step">A 서버: 내 홈페이지</span>
  <h1>서버의 내 폴더 = 내 주소</h1>
  <?php foreach ($flash as $m): ?><div class="notice ok"><?= h($m) ?></div><?php endforeach; ?>
  <?php foreach ($warn as $m): ?><div class="notice warn"><?= h($m) ?></div><?php endforeach; ?>

  <div class="cols">
    <div class="card">
      <b>지금 보고 있는 서버 폴더</b>
      <p class="path"><?= h($here) ?>/</p>
      <b>이 폴더의 주소</b>
      <p class="path"><a href="<?= h($urlBase) ?>" target="_blank"><?= h($base . $urlBase) ?></a></p>
      <p class="muted">서버는 <code>/u/<?= h($id) ?>/</code>로 시작하는 주소를 받으면, 그 뒷부분을 내 폴더 안의 경로로 바꿔 파일을 찾아 보냅니다. 폴더를 그대로 열면 그 안의 <code>index.html</code>을 보냅니다.</p>
      <p class="muted">내 폴더 사용량 <?= fmt_bytes($used) ?> / <?= fmt_bytes(SITE_QUOTA) ?></p>
    </div>
    <div class="card">
      <b>폰으로 내 주소 열기</b>
      <div class="row"><div id="qr" class="qr"></div><div class="muted">폰 카메라로 찍으세요.<br><code><?= h($base) ?>/u/<?= h($id) ?>/</code></div></div>
    </div>
  </div>

  <h2>할 일</h2>
  <ol class="tasks">
    <?php foreach ($tasks as [$t, $how, $ok]): ?>
    <li class="ex<?= $ok ? ' done' : '' ?>"><span class="badge <?= $ok ? 'ok' : '' ?>"><?= $ok ? '완료' : '할 일' ?></span> <b><?= h($t) ?></b><br><span class="meta"><?= h($how) ?></span></li>
    <?php endforeach; ?>
  </ol>
  <p class="muted">완료 표시는 서버가 내 폴더의 파일과 방문 기록을 보고 저절로 붙입니다. 새로고침하면 바뀝니다.</p>

  <h2>파일 <?php if ($dir): ?><small class="muted">/ <?= h($dir) ?></small><?php endif; ?></h2>
  <?php if ($dir): ?><p><a href="home.php?<?= h(http_build_query(['dir' => dirname($dir) === '.' ? '' : dirname($dir)])) ?>">← 위 폴더로</a></p><?php endif; ?>
  <div class="scroll">
  <table class="grid files">
    <thead><tr><th>이름</th><th>크기</th><th>고친 때</th><th>서버가 알리는 종류</th><th>할 일</th></tr></thead>
    <tbody>
    <?php if (!$files): ?><tr><td colspan="5" class="muted">비어 있습니다.</td></tr><?php endif; ?>
    <?php foreach ($files as $f): $q = $dir === '' ? $f['name'] : "$dir/{$f['name']}"; ?>
      <tr>
        <td class="name"><?php if ($f['dir']): ?><a href="home.php?<?= h(http_build_query(['dir' => $q])) ?>">📁 <?= h($f['name']) ?>/</a><?php else: ?><a href="<?= h($urlBase . $f['name']) ?>" target="_blank"><?= h($f['name']) ?></a><?php endif; ?></td>
        <td><?= $f['dir'] ? '' : fmt_bytes($f['size']) ?></td>
        <td><?= date('m-d H:i', $f['mtime']) ?></td>
        <td><code><?= $f['dir'] ? '(폴더)' : h(explode(';', SITE_TYPES[$f['ext']] ?? 'application/octet-stream')[0]) ?></code></td>
        <td class="actions">
          <?php if (!$f['dir'] && in_array($f['ext'], SITE_TEXT, true)): ?><a class="btn small ghost" href="home.php?<?= h(http_build_query(array_filter(['dir' => $dir, 'edit' => $f['name']]))) ?>#editor">고치기</a><?php endif; ?>
          <a class="btn small ghost" href="home.php?<?= h(http_build_query(array_filter(['dir' => $dir, 'peek' => ($dir ? "$dir/" : '') . $f['name'] . ($f['dir'] ? '/' : '')]))) ?>#peek">응답 보기</a>
          <form method="post" class="inline" onsubmit="var n=prompt('새 이름', <?= h(json_encode($f['name'])) ?>); if(!n) return false; this.to.value=n;">
            <?= csrf_field() ?><input type="hidden" name="act" value="rename"><input type="hidden" name="dir" value="<?= h($dir) ?>"><input type="hidden" name="from" value="<?= h($f['name']) ?>"><input type="hidden" name="to"><button class="small ghost">이름 바꾸기</button></form>
          <form method="post" class="inline" onsubmit="return confirm(<?= h(json_encode($f['name'] . '을(를) 서버에서 지울까요? 되살릴 수 없습니다.')) ?>)">
            <?= csrf_field() ?><input type="hidden" name="act" value="delete"><input type="hidden" name="dir" value="<?= h($dir) ?>"><input type="hidden" name="name" value="<?= h($f['name']) ?>"><button class="small danger">지우기</button></form>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  </div>

  <div class="cols">
    <form method="post" enctype="multipart/form-data" class="card form">
      <b>파일 올리기 (업로드)</b>
      <?= csrf_field() ?><input type="hidden" name="act" value="upload"><input type="hidden" name="dir" value="<?= h($dir) ?>">
      <input type="file" name="files[]" multiple required>
      <small class="muted">내 컴퓨터(또는 폰)의 파일이 인터넷을 지나 서버의 이 폴더로 복사됩니다. 같은 이름이 있으면 덮어씁니다. 파일 이름은 영문, 숫자, 점, 밑줄, 붙임표만 됩니다.</small>
      <button>서버로 올리기</button>
    </form>
    <div class="card">
      <form method="post" class="form"><b>새 파일</b><?= csrf_field() ?><input type="hidden" name="act" value="new"><input type="hidden" name="dir" value="<?= h($dir) ?>">
        <div class="row"><input name="name" placeholder="about.html" required style="flex:1"><button>만들기</button></div></form>
      <form method="post" class="form" style="margin-top:.8rem"><b>새 폴더</b><?= csrf_field() ?><input type="hidden" name="act" value="mkdir"><input type="hidden" name="dir" value="<?= h($dir) ?>">
        <div class="row"><input name="name" placeholder="photos" required style="flex:1"><button>만들기</button></div></form>
    </div>
  </div>

  <?php if ($editText !== null): ?>
  <h2 id="editor">고치기: <code><?= h($edit) ?></code></h2>
  <form method="post" class="card">
    <?= csrf_field() ?><input type="hidden" name="act" value="save"><input type="hidden" name="dir" value="<?= h($dir) ?>"><input type="hidden" name="name" value="<?= h($edit) ?>">
    <textarea name="text" class="code" rows="18" spellcheck="false"><?= h($editText) ?></textarea>
    <div class="row" style="margin-top:.5rem"><button>서버에 저장</button> <a href="<?= h($urlBase . $edit) ?>" target="_blank">주소로 열기</a> <a href="home.php?<?= h(http_build_query(array_filter(['dir' => $dir]))) ?>">닫기</a></div>
    <p class="muted">이 칸의 글은 [서버에 저장]을 눌러야 서버의 파일에 쓰입니다. 저장한 뒤 주소 탭을 새로고침하면 바뀐 내용이 보입니다.</p>
  </form>
  <?php endif; ?>

  <?php if ($peekRes): [$st, $hd] = $peekRes; ?>
  <h2 id="peek">요청과 응답: <code>GET /u/<?= h($id) ?>/<?= h(ltrim($peek, '/')) ?></code></h2>
  <div class="card">
    <p>브라우저가 이 주소를 달라고 하면(요청), 서버는 아래 머리글과 함께 내용을 보냅니다(응답). 브라우저는 <b>Content-Type</b>을 보고 화면에 그릴지, 소리로 틀지, 내려받을지 정합니다.</p>
    <pre class="headers">HTTP/1.1 <?= h($st) ?> <?= h([200 => 'OK', 301 => 'Moved Permanently', 404 => 'Not Found'][$st] ?? '') ?>

<?php foreach ($hd as $k => $val) echo h("$k: $val") . "\n"; ?></pre>
    <p class="muted">같은 것을 직접 보려면: 주소를 연 탭에서 F12(개발자 도구) → [네트워크] → 파일 이름을 누르고 [헤더]를 봅니다. <code>Content-Security-Policy: sandbox</code>는 학생 페이지의 프로그램이 실습실 로그인 정보를 읽지 못하게 막는 줄입니다.</p>
  </div>
  <?php endif; ?>

  <h2>책 소개 페이지 만들기</h2>
  <form method="post" class="card" id="bookform">
    <?= csrf_field() ?><input type="hidden" name="act" value="books">
    <p>권장도서를 찾아 다섯 권까지 고르면, 서버가 <code>books.html</code>(사람이 읽는 페이지)과 <code>books.json</code>(프로그램이 읽는 데이터)을 내 폴더에 만듭니다.</p>
    <div class="row"><input type="search" id="bq" placeholder="책이름이나 지은이 (예: 권정생)" style="flex:1"><button type="button" id="bfind">찾기</button></div>
    <ul id="bres" class="muted"></ul>
    <p><b>고른 책</b></p><ol id="bpick"></ol>
    <button>books.html 만들기</button>
  </form>

  <h2>서버가 남긴 방문 기록 <small class="muted">(내 주소에 들어온 요청, 최근 30건)</small></h2>
  <p class="muted">서버는 요청이 올 때마다 언제, 어느 주소를, 어떤 브라우저가 달라고 했고 무엇을 돌려줬는지 적어 둡니다(접속 기록, access log). IP 주소의 마지막 자리는 가렸습니다.</p>
  <div class="scroll"><table class="grid">
    <thead><tr><th>때</th><th>주소</th><th>상태</th><th>보낸 양</th><th>IP</th><th>브라우저 (User-Agent)</th></tr></thead>
    <tbody><?php foreach ($visits as $r): ?>
      <tr><td><?= h(substr($r['at'], 5)) ?></td><td><code><?= h($r['path']) ?></code></td><td><span class="badge <?= $r['status'] == 200 ? 'ok' : ($r['status'] == 404 ? 'bad' : 'warn') ?>"><?= h($r['status']) ?></span></td><td><?= fmt_bytes($r['bytes']) ?></td><td><?= h($r['ip']) ?></td><td title="<?= h($r['agent']) ?>"><?= h($r['agent']) ?></td></tr>
    <?php endforeach; ?><?php if (!$visits): ?><tr><td colspan="6" class="muted">아직 없습니다. 내 주소를 열어 보세요.</td></tr><?php endif; ?></tbody>
  </table></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
(function () {
  var addr = <?= json_encode($base . "/u/$id/") ?>;
  if (window.QRCode) new QRCode(document.getElementById('qr'), { text: addr, width: 128, height: 128 });
  else document.getElementById('qr').textContent = '(QR을 그리지 못했습니다. 인터넷 연결을 확인하세요.)';
  var q = document.getElementById('bq'), res = document.getElementById('bres'), pick = document.getElementById('bpick');
  function find() {
    fetch('api.php?action=books&q=' + encodeURIComponent(q.value)).then(function (r) { return r.json(); }).then(function (j) {
      res.innerHTML = '';
      (j.books || []).forEach(function (b) {
        var li = document.createElement('li'), btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'small ghost'; btn.textContent = '고르기';
        btn.onclick = function () {
          if (pick.children.length >= 5 || pick.querySelector('[value="' + b.id + '"]')) return;
          var p = document.createElement('li');
          p.innerHTML = '<input type="hidden" name="book[]" value="' + b.id + '">';
          p.appendChild(document.createTextNode(b.title + ' (' + b.publisher + ', ' + b.pub_year + ') '));
          var x = document.createElement('button'); x.type = 'button'; x.className = 'small ghost'; x.textContent = '빼기';
          x.onclick = function () { p.remove(); }; p.appendChild(x); pick.appendChild(p);
        };
        li.appendChild(document.createTextNode(b.title + ' / ' + b.author + ' / ' + b.publisher + ' '));
        li.appendChild(btn); res.appendChild(li);
      });
      if (!(j.books || []).length) res.textContent = '찾은 책이 없습니다.';
    });
  }
  document.getElementById('bfind').onclick = find;
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); find(); } });
})();
</script>
<?php page_foot();
