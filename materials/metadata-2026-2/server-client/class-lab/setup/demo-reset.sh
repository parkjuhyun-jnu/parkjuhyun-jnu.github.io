#!/bin/bash
# 수업 직전에 실행: 2단계 목록 파일과 3단계 데이터베이스를 치워 '아직 없음' 상태로 되돌립니다.
# 실행: sudo bash /srv/class-lab/setup/demo-reset.sh
set -eu
DIR=/srv/class-lab
rm -f "$DIR/www/step2/books.csv" "$DIR/data/books.db"
echo "되돌렸습니다. 2단계·3단계 화면에 '아직 없습니다'가 나와야 합니다."
