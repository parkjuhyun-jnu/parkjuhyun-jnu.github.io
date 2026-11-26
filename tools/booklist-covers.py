"""권장도서목록 JSON에 책 표지 주소와 ISBN을 더한다(카카오 책 검색 API).

    python tools/booklist-covers.py data/booklists/age9.json [--limit 20] [--redo]

- 키: 환경 변수 KAKAO_REST_API_KEY, 없으면 F:/UseAI/_공통/.env 에서 읽는다(값은 출력하지 않음).
- 책이름으로 찾아 출판사가 같은 결과를 고르고, 지은이 이름이 겹치면 더 높게 친다.
- 그림 파일은 내려받지 않고 카카오가 주는 표지 주소만 적는다(페이지가 그 주소로 보여 줌).
- 결과: rows 의 각 줄 끝에 [표지 주소, ISBN] 두 칸을 붙이고 columns 에 "표지", "ISBN"을 더한다.
  찾지 못한 책은 빈 칸으로 두고 끝에 목록을 출력한다.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ENV = Path("F:/UseAI/_공통/.env")


def key() -> str:
    k = os.environ.get("KAKAO_REST_API_KEY")
    if not k and ENV.exists():
        for line in ENV.read_text(encoding="utf-8").splitlines():
            if line.startswith("KAKAO_REST_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"')
    if not k:
        sys.exit("KAKAO_REST_API_KEY 를 찾지 못했습니다.")
    return k


def norm(s: str) -> str:
    s = re.sub(r"\(.*?\)|\[.*?\]", "", (s or "").replace("×", "x"))
    return re.sub(r"[^0-9A-Za-z가-힣]", "", s).lower()


def names(s: str) -> set:
    s = re.sub(r"(글|그림|옮김|엮음|감수|기획|사진|지음|외|역|편|저)(,|$|\s|\|)", " ", s or "")
    return {norm(w) for w in re.split(r"[,|｜·\s]+", s) if len(norm(w)) >= 2}


def search(k: str, q: str, target: str = "title") -> list:
    p = {"query": q, "size": 30}
    if target:
        p["target"] = target
    url = "https://dapi.kakao.com/v3/search/book?" + urllib.parse.urlencode(p)
    req = urllib.request.Request(url, headers={"Authorization": "KakaoAK " + k})
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.load(r).get("documents", [])
        except Exception:
            time.sleep(1 + i)
    return []


def clean_title(t: str) -> str:
    """부제(' - ', ' : ')와 권 범위(1-2, 1, 2, 상,하, Ⅰ-Ⅱ)를 뗀 책이름."""
    t = re.split(r"\s+[-:]\s*|\s*-(?=\S)(?![0-9])", t)[0]
    t = re.sub(r"\s+(\d+\s*[-,~]\s*\d+|\d+|상\s*,\s*하|[ⅠⅡⅢⅣⅤ]+\s*-\s*[ⅠⅡⅢⅣⅤ]+)(\s.*)?$", "", t)
    return t.strip()


def find(k: str, row):
    """책이름 그대로 → 부제와 권 범위를 뗀 이름 → 그 이름과 출판사로 넓게 찾기 순서로 시도."""
    t0, t1 = row[0], clean_title(row[0])
    tries = [(t0, "title", t0)]
    if t1 and t1 != t0:
        tries.append((t1, "title", t1))
    tries.append((t1 + " " + row[2], "", t1))
    for q, target, as_title in tries:
        d = pick([as_title] + list(row[1:]), search(k, q, target))
        if d:
            return d
    return None


def pick(row, docs):
    title, author, pub = row[0], row[1], row[2]
    t, p, a = norm(title), norm(pub), names(author)
    best, score = None, 0
    for d in docs:
        if not d.get("thumbnail"):
            continue
        dt, dp = norm(d.get("title")), norm(d.get("publisher"))
        da = {norm(x) for x in d.get("authors", []) + d.get("translators", [])}
        s = 0
        if dt == t: s += 4
        elif t and (dt.startswith(t) or t.startswith(dt)): s += 2
        else: continue
        if p and dp and (p in dp or dp in p): s += 4
        if a & da: s += 3
        if s > score:
            best, score = d, s
    # 책이름만 같고 출판사도 지은이도 다르면 다른 책으로 본다.
    return best if score >= 7 else None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    redo = "--redo" in sys.argv
    path = Path(args[0])
    data = json.loads(path.read_text(encoding="utf-8"))
    cols = data["columns"]
    if "표지" not in cols:
        cols += ["표지", "ISBN"]
    ci = cols.index("표지")
    k = key()
    miss = []
    rows = data["rows"][:limit] if limit else data["rows"]
    for n, row in enumerate(rows, 1):
        while len(row) < ci + 2:
            row.append("")
        if row[ci] and not redo:
            continue
        d = find(k, row)
        if d:
            row[ci] = d["thumbnail"]
            row[ci + 1] = (d.get("isbn") or "").split()[-1] if d.get("isbn") else ""
        else:
            row[ci], row[ci + 1] = "", ""
            miss.append(f"{row[0]} / {row[1]} / {row[2]}")
        if n % 50 == 0:
            print(n, "권 처리", flush=True)
        time.sleep(0.05)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    found = sum(1 for r in rows if r[ci])
    print(f"표지 찾음 {found}/{len(rows)}")
    if miss:
        print("못 찾음:")
        print("\n".join(miss))


if __name__ == "__main__":
    main()
