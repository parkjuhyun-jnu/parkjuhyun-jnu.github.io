-- ============================================================================
--  4단계 — 자료실 '수강생 전용 자료'와 수업 코드 보안 보강
--  ---------------------------------------------------------------------------
--  Supabase → SQL Editor 에 이 파일을 통째로 붙여 넣고 Run 을 누르세요.
--  여러 번 실행해도 안전합니다. (schema.sql 에도 같은 내용이 들어 있습니다.)
--
--  이 파일이 하는 일
--   1) 수업 코드 바꾸기(set_course_code)를 관리자만 부를 수 있게 막습니다.
--      (2026. 11. 23. 확인: 그전에는 로그인하지 않은 방문자도 부를 수 있었습니다.)
--   2) 수업 코드를 다섯 번 틀리면 10분 동안 더 넣지 못하게 합니다.
--   3) 수강생 전용 자료 표(class_materials)와 비공개 파일 보관함(class-materials)을 만듭니다.
--      자료의 제목과 소개는 누구나 보고, 파일과 링크는 그 묶음의 코드를 푼 사람만 엽니다.
--      '묶음'은 courses 표의 한 줄입니다. 수업 과목을 그대로 쓰거나,
--      연수처럼 수업이 아닌 것은 관리 화면에서 새 묶음을 만들어 씁니다.
-- ============================================================================


-- ── 1. 수업 코드 바꾸기는 관리자만 ──────────────────────────────────────────
-- 사이트(브라우저)에서 부르면 PostgREST 의 authenticator 로 접속하므로 관리자인지 봅니다.
-- SQL Editor 에서 직접 실행할 때는 postgres 로 접속하므로 지금처럼 그대로 됩니다.
create or replace function public.set_course_code(p_course_id text, p_code text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if session_user = 'authenticator' and not public.is_admin() then
    raise exception '관리자만 코드를 바꿀 수 있습니다.';
  end if;
  if length(coalesce(btrim(p_code), '')) < 4 then
    raise exception '코드는 4자 이상으로 정해 주세요.';
  end if;
  update public.courses
     set code_hash = crypt(btrim(p_code), gen_salt('bf'))
   where id = p_course_id;
  if not found then
    raise exception '그런 과목이나 묶음이 없습니다: %', p_course_id;
  end if;
end;
$$;

revoke execute on function public.set_course_code(text, text) from public, anon;
grant  execute on function public.set_course_code(text, text) to authenticated;


-- ── 2. 수업 코드를 여러 번 틀리면 잠시 막기 ─────────────────────────────────
-- 접근 규칙을 두지 않은 표라 브라우저에서는 볼 수 없고, 아래 함수만 다룹니다.
create table if not exists public.unlock_attempts (
  user_id      uuid not null references auth.users(id) on delete cascade,
  course_id    text not null,
  fails        smallint not null default 0,
  locked_until timestamptz,
  primary key (user_id, course_id)
);
alter table public.unlock_attempts enable row level security;

create or replace function public.unlock_course(p_course_id text, p_code text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_ok    boolean;
  v_until timestamptz;
begin
  if auth.uid() is null then
    raise exception '접속 세션이 없습니다. 페이지를 새로 고친 뒤 다시 시도해 주세요.';
  end if;

  select locked_until into v_until
    from public.unlock_attempts
   where user_id = auth.uid() and course_id = p_course_id;
  if v_until is not null and v_until > now() then
    raise exception '코드를 여러 번 틀렸습니다. 10분쯤 뒤에 다시 넣어 주세요.';
  end if;

  select (c.code_hash = crypt(btrim(coalesce(p_code, '')), c.code_hash))
    into v_ok
    from public.courses c
   where c.id = p_course_id and c.is_open;

  if coalesce(v_ok, false) then
    insert into public.course_access (user_id, course_id)
    values (auth.uid(), p_course_id)
    on conflict do nothing;
    delete from public.unlock_attempts
     where user_id = auth.uid() and course_id = p_course_id;
    return true;
  end if;

  insert into public.unlock_attempts as ua (user_id, course_id, fails)
  values (auth.uid(), p_course_id, 1)
  on conflict (user_id, course_id) do update
     set fails = ua.fails + 1,
         locked_until = case when ua.fails + 1 >= 5
                             then now() + interval '10 minutes' end;
  return false;
end;
$$;

grant execute on function public.unlock_course(text, text) to anon, authenticated;


-- ── 3. 수강생 전용 자료 표 ──────────────────────────────────────────────────
create table if not exists public.class_materials (
  id         uuid primary key default gen_random_uuid(),
  course_id  text not null references public.courses(id) on delete cascade,
  title      text not null check (length(title) between 1 and 200),
  summary    text check (summary is null or length(summary) <= 1000),
  file_path  text,
  file_name  text,
  file_size  bigint,
  link_url   text check (link_url is null or link_url ~* '^https?://'),
  created_at timestamptz not null default now(),
  constraint material_has_content check (file_path is not null or link_url is not null)
);

create index if not exists class_materials_course_idx
  on public.class_materials (course_id, created_at desc);

alter table public.class_materials enable row level security;

-- 줄 전체(파일 위치와 링크 포함)는 관리자와 코드를 푼 사람만 읽습니다.
drop policy if exists "전용 자료 읽기" on public.class_materials;
create policy "전용 자료 읽기" on public.class_materials
  for select using (public.is_admin() or public.has_access(course_id));

-- 올리기, 고치기, 지우기는 관리자만.
drop policy if exists "전용 자료 관리" on public.class_materials;
create policy "전용 자료 관리" on public.class_materials
  for all using (public.is_admin()) with check (public.is_admin());

-- 자료실 목록용: 누구나 제목과 소개, 묶음 이름을 봅니다(파일 위치와 링크는 빼고).
-- unlocked 는 지금 접속한 사람이 이 묶음을 열 수 있는지입니다.
-- 닫힌 묶음(is_open = false)의 자료는 이미 코드를 푼 사람에게만 보입니다.
create or replace function public.list_class_materials()
returns table (
  id           uuid,
  course_id    text,
  course_title text,
  course_term  text,
  title        text,
  summary      text,
  kind         text,
  file_name    text,
  file_size    bigint,
  created_at   timestamptz,
  unlocked     boolean
)
language sql stable security definer set search_path = public
as $$
  select m.id, m.course_id, c.title, c.term, m.title, m.summary,
         case when m.file_path is not null then 'file' else 'link' end,
         m.file_name, m.file_size, m.created_at,
         (public.is_admin() or public.has_access(m.course_id))
    from public.class_materials m
    join public.courses c on c.id = m.course_id
   where c.is_open or public.is_admin() or public.has_access(m.course_id)
   order by c.title, m.created_at desc;
$$;

grant execute on function public.list_class_materials() to anon, authenticated;


-- ── 4. 비공개 파일 보관함 ───────────────────────────────────────────────────
-- 무료 요금제의 파일 한 개 상한이 50MB 라서 그에 맞춥니다.
insert into storage.buckets (id, name, public, file_size_limit)
values ('class-materials', 'class-materials', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- 파일 읽기: 관리자 / 그 묶음 코드를 푼 사람 (폴더 이름이 묶음 id 입니다)
drop policy if exists "전용 자료 파일 읽기" on storage.objects;
create policy "전용 자료 파일 읽기" on storage.objects
  for select using (
    bucket_id = 'class-materials' and (
      public.is_admin()
      or public.has_access((storage.foldername(name))[1])
    )
  );

-- 파일 올리기, 고치기, 지우기: 관리자만
drop policy if exists "전용 자료 파일 올리기" on storage.objects;
create policy "전용 자료 파일 올리기" on storage.objects
  for insert with check (bucket_id = 'class-materials' and public.is_admin());

drop policy if exists "전용 자료 파일 고치기" on storage.objects;
create policy "전용 자료 파일 고치기" on storage.objects
  for update using (bucket_id = 'class-materials' and public.is_admin());

drop policy if exists "전용 자료 파일 지우기" on storage.objects;
create policy "전용 자료 파일 지우기" on storage.objects
  for delete using (bucket_id = 'class-materials' and public.is_admin());


-- ── 5. 확인 ─────────────────────────────────────────────────────────────────
-- 결과가 한 줄로 나옵니다. 세 칸이 모두 '됨'이면 끝입니다.
select
  case when to_regclass('public.class_materials') is not null then '됨' else '안 됨' end as 전용자료표,
  case when exists (select 1 from storage.buckets where id = 'class-materials')
       then '됨' else '안 됨' end                                                     as 파일보관함,
  case when has_function_privilege('anon', 'public.set_course_code(text, text)', 'execute')
       then '안 됨(방문자가 코드를 바꿀 수 있음)' else '됨' end                     as 코드변경막기;
