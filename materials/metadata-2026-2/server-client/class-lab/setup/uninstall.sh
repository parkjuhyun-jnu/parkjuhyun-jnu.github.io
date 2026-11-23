#!/bin/bash
# 학기가 끝나면: 실습용 웹 서버를 끄고 지웁니다. 참고문헌 체크 등 다른 서비스는 건드리지 않습니다.
# 실행: sudo bash /srv/class-lab/setup/uninstall.sh            (서비스만 끄기, 파일은 남김)
#       sudo bash /srv/class-lab/setup/uninstall.sh --files    (실습 폴더 /srv/class-lab 도 지우기)
set -eu
PORT=$(grep -oE '0\.0\.0\.0:[0-9]+' /etc/systemd/system/class-lab.service 2>/dev/null | cut -d: -f2 || true)
systemctl disable --now class-lab 2>/dev/null || true
rm -f /etc/systemd/system/class-lab.service
systemctl daemon-reload
if [ -n "${PORT:-}" ] && ufw status 2>/dev/null | grep -q "Status: active"; then ufw delete allow "${PORT}/tcp" || true; fi
echo "실습 서버를 껐습니다. 가비아 콘솔 방화벽에서 ${PORT:-8080}번 규칙도 지워 주세요."
if [ "${1:-}" = "--files" ]; then echo "실습 폴더 /srv/class-lab 을 지웁니다."; cd /; rm -rf /srv/class-lab; fi
