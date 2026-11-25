#!/bin/bash
# 실습용 웹 서버 설치 (한 번만). 기존 서비스(참고문헌 체크 등)의 설정 파일은 건드리지 않습니다.
#  - 설치하는 것: php-cli, php-sqlite3, sqlite3, unzip (우분투 기본 저장소)
#  - 만드는 것:   /srv/class-lab 폴더, class-lab 서비스(PHP 내장 웹 서버, 기본 8080번 문)
# 실행: sudo bash install.sh        (다른 문 번호를 쓰려면: sudo bash install.sh 8081)
set -euo pipefail
PORT="${1:-8080}"
DIR=/srv/class-lab
[ "$(id -u)" = 0 ] || { echo "관리자 권한이 필요합니다: sudo bash install.sh"; exit 1; }

if ss -tln | awk '{print $4}' | grep -qE ":${PORT}\$" && ! systemctl is-active --quiet class-lab; then
  echo "!! ${PORT}번 문을 이미 다른 프로그램이 쓰고 있습니다. 다른 번호로 실행하세요: sudo bash install.sh 8081"
  exit 1
fi

echo "== 1/4 프로그램 설치"
# needrestart가 묻거나 다른 서비스(참고문헌 체크 등)를 다시 시작하지 않게 합니다
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l NEEDRESTART_SUSPEND=1
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -y -q --no-install-recommends php-cli php-sqlite3 sqlite3 unzip

echo "== 2/4 실습 폴더 준비: $DIR"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$SRC" != "$DIR" ]; then mkdir -p "$DIR"; cp -r "$SRC"/. "$DIR"/; fi
chown -R root:root "$DIR"
chmod -R u+rwX,go+rX,go-w "$DIR"

echo "== 3/4 class-lab 서비스 만들기 (${PORT}번 문)"
cat > /etc/systemd/system/class-lab.service <<UNIT
[Unit]
Description=Class lab web server for the server-client practice
After=network.target

[Service]
User=www-data
Group=www-data
Environment=PHP_CLI_SERVER_WORKERS=4
ExecStart=/usr/bin/php -S 0.0.0.0:${PORT} -t ${DIR}/www
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now class-lab
systemctl restart class-lab

echo "== 4/4 서버 안 방화벽"
if ufw status 2>/dev/null | grep -q "Status: active"; then ufw allow "${PORT}/tcp"; echo "  ufw에서 ${PORT}번을 열었습니다."; else echo "  ufw가 꺼져 있어 바꿀 것이 없습니다."; fi

sleep 1
code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/" || echo "실패")
echo
echo "설치 끝. 서버 안에서 열어 본 결과: ${code} (200이면 정상)"
echo "다음: 가비아 콘솔의 방화벽(보안 그룹)에서 TCP ${PORT}번을 열고, 폰에서 http://공인IP:${PORT}/ 로 들어가 보세요."
