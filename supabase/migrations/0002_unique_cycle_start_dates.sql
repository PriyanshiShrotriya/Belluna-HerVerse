do $$
begin
  if exists (
    select 1
    from public.cycle_entries
    group by user_id, start_date
    having count(*) > 1
  ) then
    raise exception
      'Cannot add unique cycle-start constraint: duplicate start dates exist for a user; review records before applying this migration';
  end if;
end;
$$;

create unique index if not exists cycle_entries_user_start_date_uidx
  on public.cycle_entries (user_id, start_date);
