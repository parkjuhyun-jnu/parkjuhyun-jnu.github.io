-- ============================================================================
--  2단계 — 관리자와 과목 등록
--  ---------------------------------------------------------------------------
--  schema.sql 을 먼저 실행한 뒤, 이 파일을 SQL Editor 에 붙여 넣고 실행하세요.
--  여러 번 실행해도 안전합니다.
--
--  실행 전에 해 두어야 할 것
--    Authentication → Users → "Add user" 로 park51566@jnu.ac.kr 계정 만들기
--    (Auto Confirm User 를 꼭 체크하세요)
-- ============================================================================


-- crypt() 를 스키마 없이 부를 수 있도록 이 실행에 한해 경로를 잡아 둡니다.
set search_path = public, extensions;


-- ── 1. 관리자 등록 ──────────────────────────────────────────────────────────
-- 위에서 만든 계정을 관리자로 올립니다. 이 줄이 있어야 관리 페이지가 열립니다.
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'park51566@jnu.ac.kr'
on conflict (user_id) do nothing;


-- ── 2. 과목 등록 ────────────────────────────────────────────────────────────
-- id 는 data/courses.json 의 id 와 똑같아야 합니다. 바꾸지 마세요.
insert into public.courses (id, title, term, code_hash)
values ('ai-reading-2026-2', 'AI독서리터러시', '2026학년도 2학기', 'x')
on conflict (id) do update set title = excluded.title, term = excluded.term;

insert into public.courses (id, title, term, code_hash)
values ('metadata-2026-2', '메타데이터와아카이빙연구', '2026학년도 2학기', 'x')
on conflict (id) do update set title = excluded.title, term = excluded.term;


-- ── 3. 수업 코드 정하기 ─────────────────────────────────────────────────────
-- 코드는 해시로만 저장되므로 나중에 다시 꺼내 볼 수 없습니다.
-- 바꾸고 싶으면 아래 줄의 '2662' 를 새 코드로 고쳐 다시 실행하면 됩니다.
select public.set_course_code('ai-reading-2026-2', '2662');
select public.set_course_code('metadata-2026-2',   '2662');


-- ── 4. 확인 ─────────────────────────────────────────────────────────────────
-- SQL Editor 는 마지막 결과 하나만 보여 주므로, 한 줄에 모아서 보여 줍니다.
-- 아래 결과를 그대로 보여 주시면 무엇이 빠졌는지 바로 알 수 있습니다.
select
  (select count(*) from public.admins)                          as 관리자수,
  coalesce((select string_agg(email, ', ') from public.admins),
           '(없음)')                                             as 관리자,
  (select count(*) from public.courses)                         as 과목수,
  coalesce((select string_agg(
              id || ' → ' ||
              case when code_hash = crypt('2662', code_hash)
                   then '2662 맞음' else '2662 아님' end,
              '  |  ' order by id)
            from public.courses), '(없음)')                      as 수업코드확인;


-- ============================================================================
--  나중에 쓸 일이 있을 때
-- ----------------------------------------------------------------------------
--  학기가 끝나 제출을 닫고 싶을 때
--    update public.courses set is_open = false where id = 'ai-reading-2026-2';
--
--  다음 학기 과목을 새로 열 때 (id 는 data/courses.json 에도 같이 넣어야 합니다)
--    insert into public.courses (id, title, term, code_hash)
--    values ('새-과목-id', '과목명', '2027학년도 1학기', 'x')
--    on conflict (id) do update set title = excluded.title, term = excluded.term;
--    select public.set_course_code('새-과목-id', '새코드');
--
--  학생이 지운 결과물을 되살리고 싶을 때 (관리 페이지에서도 할 수 있습니다)
--    update public.submissions set deleted_at = null where id = '...';
-- ============================================================================
