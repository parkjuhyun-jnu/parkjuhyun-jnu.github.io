#!/bin/bash
# 0단계 점검: 서버 상태를 '읽기만' 합니다. 아무것도 설치하거나 바꾸지 않습니다.
# 실행: bash check.sh   (결과 화면을 복사해 Claude에게 보여 주세요. 비밀번호는 나오지 않습니다.)
echo "== 운영체제";        (lsb_release -ds 2>/dev/null || head -2 /etc/os-release)
echo "== 접속한 계정";     whoami
echo "== 열려 있는 문(포트)과 그 문을 쓰는 프로그램"
(sudo -n ss -tlnp 2>/dev/null || ss -tln) | sed 's/users:((/  ← /'
echo "== 설치된 프로그램"
for c in nginx apache2 php sqlite3 mysql mariadb python3 node docker unzip curl; do
  printf '  %-8s %s\n' "$c" "$(command -v $c || echo '-')"
done
echo "== 돌고 있는 주요 서비스"
systemctl list-units --type=service --state=running --no-pager --plain 2>/dev/null \
  | grep -iE 'nginx|apache|php|mysql|maria|postgres|docker|gunicorn|uvicorn|node|pm2|class-lab' || echo "  (해당 없음)"
echo "== 서버 안 방화벽(ufw)"
if command -v ufw >/dev/null; then sudo -n ufw status 2>/dev/null | head -8 || echo "  (확인 못 함)"; else echo "  ufw 없음"; fi
echo "== 디스크 여유";     df -h / | tail -1
echo "== 실습 폴더";       ls -la /srv/class-lab 2>/dev/null || echo "  (아직 없음)"
