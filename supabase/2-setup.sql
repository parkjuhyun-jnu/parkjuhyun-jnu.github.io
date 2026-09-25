-- ============================================================================
--  schema.sql 을 먼저 실행한 뒤, 이 파일을 SQL Editor 에 붙여 넣고 실행하세요.
--  ※ 아래 '여기에수업코드' 두 군데를 실제 코드로 바꾼 다음 실행해야 합니다.
-- ============================================================================

-- ── 1) 관리자 등록 ─────────────────────────────────────────
-- Authentication → Users 에서 park51566@jnu.ac.kr 계정을 먼저 만들어야 합니다.
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'park51566@jnu.ac.kr'
on conflict (user_id) do nothing;


-- ── 2) 과목 등록 ───────────────────────────────────────────
insert into public.courses (id, title, term, code_hash) values
  ('ai-reading-2026-2', 'AI독서리터러시',          '2026학년도 2학기', 'x'),
  ('metadata-2026-2',   '메타데이터와아카이빙연구', '2026학년도 2학기', 'x')
on conflict (id) do update
  set title = excluded.title, term = excluded.term;


-- ── 3) 수업 코드 정하기 ────────────────────────────────────
-- 6자 이상. 학생에게 수업 시간에만 알려 주세요.
-- 암호화되어 저장되므로 나중에 다시 볼 수 없습니다(잊으면 여기서 새로 정하면 됩니다).
select public.set_course_code('ai-reading-2026-2', '여기에수업코드');
select public.set_course_code('metadata-2026-2',   '여기에수업코드');


-- ── 4) 확인 ────────────────────────────────────────────────
select id, title, term, is_open from public.courses order by id;
select email from public.admins;
