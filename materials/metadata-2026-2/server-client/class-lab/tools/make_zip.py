"""class-lab 폴더를 class-lab.zip 한 묶음으로 만듭니다(서버 설치 명령이 내려받는 파일).

학생 자료(var/), 파이썬 캐시, 시연 때 생기는 books.db와 step2/books.csv는 넣지 않습니다.
파일 날짜를 고정해 내용이 같으면 같은 zip이 나오게 합니다.
실행: python tools/make_zip.py   (class-lab 폴더 안에서든 밖에서든)
"""
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # .../server-client/class-lab
OUT = os.path.join(os.path.dirname(ROOT), 'class-lab.zip')
SKIP_DIRS = {'var', '__pycache__', '.git'}
SKIP_FILES = {os.path.join('data', 'books.db'), os.path.join('www', 'step2', 'books.csv')}
STAMP = (2026, 11, 26, 12, 0, 0)

names = []
for d, dirs, files in os.walk(ROOT):
    dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS)
    for f in sorted(files):
        rel = os.path.relpath(os.path.join(d, f), ROOT)
        if rel in SKIP_FILES or f.startswith('.'):
            continue
        names.append(rel)

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for rel in names:
        info = zipfile.ZipInfo('class-lab/' + rel.replace(os.sep, '/'), STAMP)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o755 if rel.endswith('.sh') else 0o644) << 16
        with open(os.path.join(ROOT, rel), 'rb') as fh:
            z.writestr(info, fh.read())
print(f'{OUT}: 파일 {len(names)}개, {os.path.getsize(OUT):,} 바이트')
