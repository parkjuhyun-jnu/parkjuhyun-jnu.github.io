# 실습 5. SPARQL 질의 세 개 (10분)

국립중앙도서관 SPARQL 편집기(https://lod.nl.go.kr/editor)에 하나씩 붙여 넣고 실행합니다.
한글 문자열 대신 URI만 쓰는 질의입니다.

## 질의 1. 저자 생텍쥐페리와 '같은' 외부 데이터
```
SELECT ?same WHERE {
  <http://lod.nl.go.kr/resource/KAC199623935> <http://www.w3.org/2002/07/owl#sameAs> ?same
}
```
질문: 결과는 몇 줄인가? Wikidata 주소는 무엇인가?

## 질의 2. 『어린 왕자』(문학동네, 2007) 레코드의 모든 트리플
```
SELECT ?p ?o WHERE {
  <http://lod.nl.go.kr/resource/KMO200722491> ?p ?o
}
```
질문: ISBN이 든 서술어(?p)는? 소장 등록번호가 든 서술어는?

## 질의 3. 번역자 김화영이 참여한 책 (오래된 순 5권)
```
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX nlon: <http://lod.nl.go.kr/ontology/>
PREFIX nlk: <http://lod.nl.go.kr/resource/>
SELECT ?book ?title ?year WHERE {
  ?book dcterms:creator nlk:KAC201114808 ;
        a nlon:Book ;
        dcterms:title ?title ;
        nlon:issuedYear ?year .
}
ORDER BY ?year
LIMIT 5
```
질문: LIMIT를 10으로, ORDER BY를 `DESC(?year)`로 바꾸면 결과가 어떻게 달라지나?
