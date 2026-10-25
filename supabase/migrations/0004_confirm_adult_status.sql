begin;

revoke update on table public.profiles from authenticated;
revoke update (adult_confirmed) on table public.profiles from authenticated;
grant update (preferred_language) on table public.profiles to authenticated;

create function public.confirm_adult_status()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  update public.profiles
  set adult_confirmed = true
  where id = current_user_id;

  if not found then
    raise exception 'Profile not found'
      using errcode = 'P0002';
  end if;
end;
$$;

alter function public.confirm_adult_status() owner to postgres;
revoke all on function public.confirm_adult_status() from public, anon, authenticated;
grant execute on function public.confirm_adult_status() to authenticated;

commit;
