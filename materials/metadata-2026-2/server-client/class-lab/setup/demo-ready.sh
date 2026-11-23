#!/bin/bash
# 시연을 건너뛰거나 수업 뒤 학생이 다시 볼 수 있게: 2단계 목록 파일과 3단계 데이터베이스를 한 번에 준비합니다.
# 실행: sudo bash /srv/class-lab/setup/demo-ready.sh
set -eu
DIR=/srv/class-lab
cp "$DIR/data/books.csv" "$DIR/www/step2/books.csv"
cd "$DIR/data" && sqlite3 books.db < load.sql
chmod a+r "$DIR/www/step2/books.csv" "$DIR/data/books.db"
echo "준비했습니다. 2단계·3단계 화면을 새로고침해 보세요."
