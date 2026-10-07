-- ============================================================================
--  3단계 — 올린 본인이 공개 범위(수업 공개 ↔ 모두 공개)를 바꾸기
--  ---------------------------------------------------------------------------
--  Supabase → SQL Editor 에 이 파일을 통째로 붙여 넣고 Run 을 누르세요.
--  여러 번 실행해도 안전합니다. (schema.sql 에도 같은 내용이 들어 있습니다.)
--
--  지우기와 같은 방식입니다: 올릴 때 적은 이름과 삭제 암호(숫자 4자리)가 둘 다 맞아야 하고,
--  5번 틀리면 10분 동안 잠깁니다. 관리자가 '비공개'로 돌린 결과물은 본인이 바꿀 수 없습니다.
--  관리자는 원래대로 화면에서 바로 바꿀 수 있습니다(이 함수와 상관없음).
-- ============================================================================

create or replace function public.set_own_visibility(
  p_id uuid, p_name text, p_password text, p_visibility text
)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_sub public.submissions;
  v_key public.submission_keys;
  v_ok  boolean;
begin
  if p_visibility not in ('class', 'public') then
    raise exception '공개 범위는 수업 공개 또는 모두 공개만 고를 수 있습니다.';
  end if;

  select * into v_sub from public.submissions where id = p_id and deleted_at is null;
  if not found then
    raise exception '이미 지워졌거나 찾을 수 없는 결과물입니다.';
  end if;
  if v_sub.visibility = 'private' then
    raise exception '담당 교수가 비공개로 돌린 결과물입니다. 담당 교수에게 말씀해 주세요.';
  end if;

  select * into v_key from public.submission_keys where submission_id = p_id;
  if not found then
    raise exception '이 결과물에는 삭제 암호가 없습니다. 담당 교수에게 말씀해 주세요.';
  end if;

  if v_key.locked_until is not null and v_key.locked_until > now() then
    raise exception '여러 번 틀렸습니다. 10분쯤 뒤에 다시 시도해 주세요.';
  end if;

  v_ok := replace(lower(btrim(coalesce(p_name, ''))), ' ', '')
          = replace(lower(btrim(v_sub.author_name)), ' ', '')
      and v_key.pw_hash = crypt(coalesce(p_password, ''), v_key.pw_hash);

  if not v_ok then
    update public.submission_keys
       set fails = fails + 1,
           locked_until = case when fails + 1 >= 5
                               then now() + interval '10 minutes' end
     where submission_id = p_id;
    return false;
  end if;

  update public.submissions set visibility = p_visibility where id = p_id;
  update public.submission_keys set fails = 0, locked_until = null
   where submission_id = p_id;
  return true;
end;
$$;

grant execute on function public.set_own_visibility(uuid, text, text, text) to anon, authenticated;
