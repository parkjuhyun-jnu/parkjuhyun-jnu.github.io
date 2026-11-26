#!/bin/bash
# 실습용 웹 서버 설치. 여러 번 실행해도 됩니다(학생 자료가 든 /srv/class-lab/var 는 지우지 않음).
# 기존 서비스(참고문헌 체크 등)의 설정 파일은 건드리지 않습니다.
#  - 설치하는 것: php-cli, php-sqlite3, php-mbstring, php-zip, sqlite3, unzip, curl (웹 서버와 SQL 실습)
#                 ffmpeg, exiftool, heif-convert (아카이빙 실습: 기술 메타데이터 뽑기, 이용본 만들기)
#  - 만드는 것:   /srv/class-lab 폴더, class-lab 서비스(PHP 내장 웹 서버, 기본 8080번 문)
#                 /srv/class-lab/var (학생 실습실 자료: 홈페이지, 내 DB, 아카이브. www-data 소유)
# 실행: sudo bash install.sh        (다른 문 번호를 쓰려면: sudo bash install.sh 8081)
set -euo pipefail
PORT="${1:-8080}"
DIR=/srv/class-lab
[ "$(id -u)" = 0 ] || { echo "관리자 권한이 필요합니다: sudo bash install.sh"; exit 1; }

if ss -tln | awk '{print $4}' | grep -qE ":${PORT}\$" && ! systemctl is-active --quiet class-lab; then
  echo "!! ${PORT}번 문을 이미 다른 프로그램이 쓰고 있습니다. 다른 번호로 실행하세요: sudo bash install.sh 8081"
  exit 1
fi

echo "== 1/5 프로그램 설치 (처음에는 몇 분 걸립니다)"
# needrestart가 묻거나 다른 서비스(참고문헌 체크 등)를 다시 시작하지 않게 합니다
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l NEEDRESTART_SUSPEND=1
apt-get update -q
apt-get install -y -q --no-install-recommends php-cli php-sqlite3 php-mbstring php-zip sqlite3 unzip curl
apt-get install -y -q --no-install-recommends ffmpeg libimage-exiftool-perl \
  || echo "  !! ffmpeg나 exiftool을 설치하지 못했습니다. 아카이빙 실습의 기술 메타데이터와 이용본이 '도구 없음'으로 나옵니다."
apt-get install -y -q --no-install-recommends libheif-examples \
  || echo "  (heif-convert가 없어 아이폰 HEIC 사진의 이용본은 만들지 못할 수 있습니다.)"

echo "== 2/5 실습 폴더 준비: $DIR"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$SRC" != "$DIR" ]; then mkdir -p "$DIR"; cp -r "$SRC"/. "$DIR"/; fi
chown -R root:root "$DIR"
chmod -R u+rwX,go+rX,go-w "$DIR"
# 학생 자료 폴더: 실습실 프로그램(www-data)만 쓰고 읽습니다
mkdir -p "$DIR/var"
chown -R www-data:www-data "$DIR/var"
chmod 750 "$DIR/var"

echo "== 3/5 학생 실습실 준비 (목록 DB, 함께 쓰는 DB, 보기 파일, 입장 코드)"
sudo -u www-data php "$DIR/setup/lab-init.php"

echo "== 4/5 class-lab 서비스 만들기 (${PORT}번 문)"
cat > /etc/systemd/system/class-lab.service <<UNIT
[Unit]
Description=Class lab web server for the server-client practice
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=${DIR}/www
Environment=PHP_CLI_SERVER_WORKERS=8
Environment=TZ=Asia/Seoul
ExecStart=/usr/bin/php -d upload_max_filesize=110M -d post_max_size=120M -d memory_limit=256M -d max_execution_time=120 -d session.save_path=${DIR}/var/sessions -d session.gc_maxlifetime=28800 -S 0.0.0.0:${PORT} -t ${DIR}/www ${DIR}/www/router.php
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${DIR}/var
ProtectHome=true
PrivateTmp=true
Nice=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now class-lab
systemctl restart class-lab

echo "== 5/5 서버 안 방화벽"
if ufw status 2>/dev/null | grep -q "Status: active"; then ufw allow "${PORT}/tcp"; echo "  ufw에서 ${PORT}번을 열었습니다."; else echo "  ufw가 꺼져 있어 바꿀 것이 없습니다."; fi

sleep 1
code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/" || echo "실패")
lab=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/lab/" || echo "실패")
echo
echo "설치 끝. 서버 안에서 열어 본 결과: 처음 화면 ${code}, 학생 실습실 ${lab} (둘 다 200이면 정상)"
echo "도구: ffmpeg $(command -v ffmpeg >/dev/null && echo 있음 || echo 없음), exiftool $(command -v exiftool >/dev/null && echo 있음 || echo 없음), heif-convert $(command -v heif-convert >/dev/null && echo 있음 || echo 없음)"
echo
echo "== 자체 점검 (1~2분)"
sudo -u www-data php "$DIR/setup/selftest.php" "$PORT" || true
echo
echo "---- 아래 두 줄은 화면 공유나 캡처에 넣지 마세요 ----"
sudo -u www-data php -r 'require "/srv/class-lab/lib/app.php"; $s = settings(); echo "학생 입장 코드: {$s["class_code"]}\n교수 코드:      {$s["teacher_code"]}  (학생에게 알리지 마세요)\n";'
echo
echo "다음: 가비아 콘솔의 방화벽(보안 그룹)에서 TCP ${PORT}번이 열려 있는지 보고,"
echo "      폰에서 http://공인IP:${PORT}/ (시연)와 http://공인IP:${PORT}/lab/ (학생 실습실)로 들어가 보세요."
