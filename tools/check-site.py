"""
사이트 점검 — '멈춘 것처럼 보이지 않게' 하는 운영 원칙을 기계로 확인합니다.

    python3 tools/check-site.py              # 내부 점검만 (빠름)
    python3 tools/check-site.py --external   # 기사·영상·DOI 등 바깥 링크도 열어 봄

확인하는 것
  1. 페이지 사이 링크와 그림·스크립트 경로가 실제 파일을 가리키는지 (메뉴 이름과 파일 이름 불일치, 404)
  2. 미디어 기록(data/media.json): 날짜 필수·형식, 구분(type), 제목, 포스터 파일, 대표 카드 수
  3. 논문 링크(data/pub-links.json)가 논문 목록(publications.json)과 맞는지
     — KCI 엑셀을 새로 가져와 새 논문이 생기면 '링크 없음'으로 알려 줍니다
  4. 연구과제(projects.json) 날짜 형식, 과목(courses.json)의 주제 이름
  5. (--external) 바깥 링크가 아직 열리는지 — 매체가 기사를 내리면 알 수 있게

오류가 있으면 종료 코드 1, 경고만 있으면 0 입니다.
GitHub Actions(.github/workflows/check-site.yml)가 올릴 때마다, 그리고 매주 한 번 돌립니다.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def load(rel: str):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


# ---------------------------------------------------------------- 1. 내부 링크
class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs: list[str] = []
        self.anchors: list[str] = []   # 바깥 링크 점검은 <a href> 만 (글꼴·CDN 주소 제외)

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if k in ("href", "src") and v:
                self.refs.append(v)
                if tag == "a" and k == "href" and v.startswith("http"):
                    self.anchors.append(v)


def is_local(ref: str) -> bool:
    return not re.match(r"^(https?:|mailto:|tel:|data:|javascript:|#|//)", ref) and "${" not in ref


def check_internal_links() -> list[str]:
    external: list[str] = []
    for page in sorted(ROOT.glob("*.html")):
        p = Links()
        p.feed(page.read_text(encoding="utf-8"))
        external += p.anchors
        for ref in p.refs:
            if not is_local(ref):
                continue
            path = ref.split("#")[0].split("?")[0].lstrip("/")   # '/assets/…' 는 사이트 뿌리 기준
            if path and not (ROOT / path).exists():
                err(f"{page.name}: 없는 파일을 가리킴 → {ref}")
    # 스크립트 안에서 부르는 자료 파일과 페이지
    for js in [*ROOT.glob("assets/js/*.js"), *ROOT.glob("*.html")]:
        text = js.read_text(encoding="utf-8")
        for ref in set(re.findall(r"['\"`]((?:data/[\w-]+\.json)|(?:[\w-]+\.html))(?=[?'\"`])", text)):
            if not (ROOT / ref).exists():
                err(f"{js.relative_to(ROOT)}: 없는 파일을 부름 → {ref}")
    return external


# ---------------------------------------------------------------- 2. 미디어 기록
DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


def check_media() -> list[str]:
    urls: list[str] = []
    data = load("data/media.json")
    types = data.get("types", {})
    featured = 0
    for i, x in enumerate(data.get("items", []), 1):
        name = f"media.json {i}번째 「{str(x.get('title', ''))[:30]}」"
        if not x.get("date"):
            err(f"{name}: 날짜(date)가 없습니다 — 날짜 없는 항목은 화면에 나오지 않습니다")
        elif not DATE_RE.match(str(x["date"])):
            err(f"{name}: 날짜 형식이 틀렸습니다 ({x['date']}) — 2022-08-15 / 2022-08 / 2022")
        if not x.get("title"):
            err(f"{name}: 제목(title)이 없습니다")
        if x.get("type") not in types:
            err(f"{name}: 구분(type) '{x.get('type')}' 은 types 에 없습니다")
        if x.get("image") and not (ROOT / x["image"]).exists():
            warn(f"{name}: 포스터 파일이 아직 없습니다 → {x['image']} (링크는 숨겨집니다)")
        if x.get("check"):
            warn(f"{name}: '확인 중' — {x['check']}")
        featured += bool(x.get("featured"))
        urls += [x["url"]] if x.get("url") else []
        urls += [l["url"] for l in x.get("links", []) if l.get("url")]
    if featured not in (0, 3, 6):
        warn(f"media.json: 대표(featured)가 {featured}개입니다 — 3개나 6개일 때 카드 줄이 맞습니다")
    return urls


# ---------------------------------------------------------------- 3. 논문 링크
def check_pub_links() -> list[str]:
    pubs = {p["title"] for p in load("data/publications.json")["items"]}
    links = load("data/pub-links.json").get("items", [])
    have = {e["title"] for e in links}
    for t in sorted(pubs - have):
        warn(f"pub-links.json: 새 논문에 KCI·DOI 링크가 없습니다 — 「{t[:40]}」")
    for t in sorted(have - pubs):
        err(f"pub-links.json: 논문 목록에 없는 제목입니다(제목이 바뀌었나요?) — 「{t[:40]}」")
    return [f"https://doi.org/{e['doi']}" for e in links if e.get("doi")]


# ---------------------------------------------------------------- 4. 과제·과목
def check_projects_courses() -> None:
    for p in load("data/projects.json").get("projects", []):
        for k in ("start", "end"):
            v = p.get(k)
            if v and not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
                err(f"projects.json 「{p.get('title', '')[:30]}」: {k} 형식이 틀렸습니다 ({v})")
    themes = {"reading", "mil", "school", "policy", "library"}
    for c in load("data/courses.json").get("courses", []):
        if c.get("theme") and c["theme"] not in themes:
            warn(f"courses.json {c.get('id')}: 주제 '{c['theme']}' 는 갤러리 필터에 없습니다")


# ---------------------------------------------------------------- 5. 바깥 링크
def check_external(urls: list[str]) -> None:
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36"
    for url in sorted(set(urls)):
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                code = r.status
        except urllib.error.HTTPError as e:
            code = e.code
        except Exception as e:  # 연결 실패, 시간 초과
            warn(f"바깥 링크 열리지 않음 ({type(e).__name__}) → {url}")
            continue
        if code == 404 or code == 410:
            err(f"바깥 링크가 사라졌습니다 ({code}) → {url}")
        elif code >= 400 and code not in (401, 403, 405, 429):
            warn(f"바깥 링크 응답 {code} → {url}")


def main() -> None:
    external = check_internal_links()
    urls = check_media() + check_pub_links()
    check_projects_courses()
    if "--external" in sys.argv:
        check_external(urls + external)

    for w in warnings:
        print(f"경고  {w}")
    for e in errors:
        print(f"오류  {e}")
    print(f"\n점검 끝: 오류 {len(errors)}건, 경고 {len(warnings)}건")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
