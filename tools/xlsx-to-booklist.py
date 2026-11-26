"""권장도서목록 엑셀을 자료실 검색 표용 JSON으로 바꾼다.

    python tools/xlsx-to-booklist.py <엑셀.xlsx> data/booklists/<id>.json

엑셀 첫 시트의 첫 줄은 머리글(책이름, 지은이, 출판사, 출판년도, 쪽수, 연령, 갈래, 가격, 주제어)이다.
만든 뒤 엑셀은 assets/files/booklists/ 에 두고 data/booklists.json 맨 위에 목록 한 칸을 더한다.
"""
import json
import re
import sys

import openpyxl

COLS = ["책이름", "지은이", "출판사", "출판년도", "쪽수", "갈래", "가격", "주제어"]


def main(src: str, dst: str) -> None:
    ws = openpyxl.load_workbook(src, read_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h or "").strip() for h in rows[0]]
    idx = {h: i for i, h in enumerate(head)}
    missing = [c for c in COLS if c not in idx]
    if missing:
        sys.exit(f"머리글에 없는 칸: {missing}")
    out = []
    for r in rows[1:]:
        if not any(r):
            continue
        cell = lambda c: ("" if r[idx[c]] is None else str(r[idx[c]])).strip()
        year = cell("출판년도")
        out.append([
            cell("책이름"), cell("지은이"), cell("출판사"),
            int(year) if year.isdigit() else year,
            cell("쪽수"), cell("갈래"), cell("가격"),
            re.sub(r"\s*\n\s*", ", ", cell("주제어")).strip(" ,"),
        ])
    with open(dst, "w", encoding="utf-8") as f:
        json.dump({"columns": COLS, "rows": out}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(out)}권 → {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
