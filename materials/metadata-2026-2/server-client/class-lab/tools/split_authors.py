"""권장도서 목록(books.csv)의 '지은이' 칸을 사람(person)과 역할(credit)로 나눕니다.

연구회 표기 예: '사노 요코 글, 그림 | 김난주 옮김'
  -> 사노 요코(글), 사노 요코(그림), 김난주(옮김)
나누지 못한 칸은 역할을 '(확인 필요)'로 두고 원래 글자를 raw 칸에 남깁니다.
실행: python tools/split_authors.py   (class-lab 폴더에서)  -> data/person.csv, data/credit.csv, data/role.csv
"""
import csv, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# 역할 낱말 -> (표준 역할, MARC 역할 부호). 오타와 붙여 쓴 것도 여기서 바로잡습니다.
ROLE = {
    '글': ('글', 'aut'), '지음': ('글', 'aut'), '시': ('글', 'aut'),
    '그림': ('그림', 'ill'), '옮김': ('옮김', 'trl'), '욺김': ('옮김', 'trl'),
    '엮음': ('엮음', 'com'), '사진': ('사진', 'pht'), '찍음': ('사진', 'pht'),
    '원작': ('원작', 'ant'), '원저': ('원작', 'ant'), '감수': ('감수', 'rev'),
    '자문·감수': ('감수', 'rev'), '기획': ('기획', 'pro'), '해설': ('해설', 'aui'),
    '작곡': ('작곡', 'cmp'), '꾸밈': ('꾸밈', 'dsr'), '만듦': ('만듦', 'cre'),
    '지도': ('지도', 'tch'), '읽음': ('읽음', 'nrt'), '작품': ('작품', 'art'),
    '어린이 일기': ('글', 'aut'),
}
ROLE_LABEL = {
    '글': '글을 씀', '그림': '그림을 그림', '옮김': '다른 말에서 옮김', '엮음': '여러 글을 모아 엮음',
    '사진': '사진을 찍음', '원작': '바탕이 된 원래 작품을 씀', '감수': '내용을 검토함', '기획': '책을 기획함',
    '해설': '해설을 씀', '작곡': '노래를 지음', '꾸밈': '책을 꾸밈', '만듦': '만듦', '지도': '글쓰기를 지도함',
    '읽음': '읽음', '작품': '작품을 만듦', '(확인 필요)': '연구회 표기에 역할이 없거나 알아보기 어려움',
}
ROLE_WORDS = sorted(ROLE, key=len, reverse=True)
role_alt = '|'.join(re.escape(w) for w in ROLE_WORDS)
# '이름들 역할[, 역할…]' 한 덩어리. 이름과 역할 사이는 띄어 씁니다('안윤경그림'처럼 붙은 것은 확인 필요로 남김).
CHUNK = re.compile(rf'^(?P<names>.+?)\s+(?P<roles>(?:{role_alt})(?:\s*,\s*(?:{role_alt}))*)(?:\((?P<note>[^)]*)\))?$')

def split_chunk(text):
    """'박지원 원작, 박상률 글'처럼 한 칸에 둘 이상이 섞인 것을 나눕니다."""
    out, rest = [], text.strip()
    # 뒤에서부터 '…역할' 덩어리를 떼어 냅니다.
    pattern = re.compile(rf'(.+?\s+(?:{role_alt})(?:\s*,\s*(?:{role_alt}))*(?:\([^)]*\))?)(?:\s*,\s*|$)')
    pos = 0
    while pos < len(rest):
        m = pattern.match(rest, pos)
        if not m:
            break
        out.append(m.group(1).strip())
        pos = m.end()
    if pos < len(rest) or not out:
        return [text.strip()]
    return out

def parse(author):
    credits = []
    # 구분 기호는 대부분 '|'지만 한글 자모 'ㅣ'나 '/'로 적힌 것도 있습니다.
    for seg in re.split(r'[|ㅣ/]', author):
        seg = seg.strip()
        if not seg:
            continue
        for piece in split_chunk(seg):
            m = CHUNK.match(piece)
            if not m:
                credits.append((piece, '(확인 필요)', '', piece))
                continue
            names = [n.strip() for n in m.group('names').split(',') if n.strip()]
            roles = [r.strip() for r in m.group('roles').split(',')]
            for n in names:
                for r in roles:
                    std, _ = ROLE[r]
                    credits.append((n, std, r, piece))
    return credits

def main():
    rows = list(csv.DictReader(open(ROOT / 'data/books.csv', encoding='utf-8-sig')))
    persons, credit_rows = {}, []
    for r in rows:
        seq = 0
        for name, role, word, raw in parse(r['지은이']):
            seq += 1
            pid = persons.setdefault(name, len(persons) + 1)
            credit_rows.append([r['번호'], pid, role, seq, raw])
    with open(ROOT / 'data/person.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['person_id', 'name'])
        for n, i in sorted(persons.items(), key=lambda x: x[1]): w.writerow([i, n])
    with open(ROOT / 'data/credit.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['book_id', 'person_id', 'role', 'seq', 'raw'])
        w.writerows(credit_rows)
    codes = {}
    for word, (std, code) in ROLE.items(): codes.setdefault(std, code)
    codes['(확인 필요)'] = ''
    with open(ROOT / 'data/role.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(['role', 'marc_code', 'meaning'])
        for std, code in codes.items(): w.writerow([std, code, ROLE_LABEL.get(std, '')])
    unk = [c for c in credit_rows if c[2] == '(확인 필요)']
    print(f'책 {len(rows)}권, 사람 {len(persons)}명, 역할 기록 {len(credit_rows)}건, 확인 필요 {len(unk)}건')

if __name__ == '__main__':
    main()
