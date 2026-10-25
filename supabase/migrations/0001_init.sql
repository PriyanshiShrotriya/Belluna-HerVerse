create extension if not exists pgcrypto;

create table public.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.moderators enable row level security;
revoke all on table public.moderators from public, anon, authenticated;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.moderators
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_moderator() from public, anon, authenticated;
grant execute on function public.is_moderator() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'hi')),
  adult_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (preferred_language, adult_confirmed)
  on table public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle)
  values (
    new.id,
    'belluna_' || pg_catalog.substr(
      pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
      1,
      8
    )
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
alter table public.cycle_entries enable row level security;
create policy "owner all" on public.cycle_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on table public.cycle_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.cycle_entries to authenticated;
create index cycle_entries_user_start_date_idx
  on public.cycle_entries (user_id, start_date desc);

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  log_date date not null,
  flow smallint check (flow between 0 and 4),
  pain smallint check (pain between 0 and 10),
  mood text check (mood in ('great', 'good', 'okay', 'low', 'anxious', 'irritable')),
  notes text check (char_length(notes) <= 500),
  unique (user_id, log_date)
);
alter table public.daily_logs enable row level security;
create policy "owner all" on public.daily_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on table public.daily_logs from public, anon, authenticated;
grant select, insert, update, delete on table public.daily_logs to authenticated;
create index daily_logs_user_log_date_idx
  on public.daily_logs (user_id, log_date desc);

create table public.symptom_catalog (
  code text primary key,
  category text not null,
  label_en text not null,
  label_hi text not null
);
alter table public.symptom_catalog enable row level security;
create policy "catalog read" on public.symptom_catalog
  for select to authenticated
  using (true);
revoke all on table public.symptom_catalog from public, anon, authenticated;
grant select on table public.symptom_catalog to authenticated;

create table public.symptom_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  log_date date not null,
  symptom_code text not null references public.symptom_catalog(code),
  severity smallint not null check (severity between 1 and 5),
  unique (user_id, log_date, symptom_code)
);
alter table public.symptom_entries enable row level security;
create policy "owner all" on public.symptom_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on table public.symptom_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.symptom_entries to authenticated;
create index symptom_entries_user_log_date_idx
  on public.symptom_entries (user_id, log_date desc);

create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count int not null default 0,
  primary key (user_id, usage_date)
);
alter table public.ai_usage enable row level security;
revoke all on table public.ai_usage from public, anon, authenticated;

create table public.ai_quota_config (
  id smallint primary key check (id = 1),
  daily_limit int not null check (daily_limit > 0)
);
alter table public.ai_quota_config enable row level security;
revoke all on table public.ai_quota_config from public, anon, authenticated;
revoke all on table public.ai_quota_config from service_role;

drop function if exists public.consume_ai_quota(int);

create or replace function public.consume_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  c int;
  configured_limit int;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    return false;
  end if;

  select daily_limit
  into configured_limit
  from public.ai_quota_config
  where id = 1;

  if not found or configured_limit is null or configured_limit <= 0 then
    return false;
  end if;

  insert into public.ai_usage (user_id, usage_date, count)
  values (current_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set count = public.ai_usage.count + 1
  returning count into c;

  return c <= configured_limit;
end;
$$;
revoke all on function public.consume_ai_quota() from public, anon, authenticated;
grant execute on function public.consume_ai_quota() to authenticated;

create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_hi text not null,
  is_active boolean not null default true
);
alter table public.chat_rooms enable row level security;
create policy "rooms read" on public.chat_rooms
  for select to authenticated
  using (
    is_active
    and (
      exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.adult_confirmed
      )
      or (select public.is_moderator())
    )
  );
revoke all on table public.chat_rooms from public, anon, authenticated;
grant select on table public.chat_rooms to authenticated;

create table public.chat_blocks (
  blocker_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  blocked_handle text not null,
  primary key (blocker_id, blocked_handle)
);
alter table public.chat_blocks enable row level security;
create policy "blocks own" on public.chat_blocks
  for all to authenticated
  using (
    blocker_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.adult_confirmed
    )
  )
  with check (
    blocker_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.adult_confirmed
    )
  );
revoke all on table public.chat_blocks from public, anon, authenticated;
grant select, insert, delete on table public.chat_blocks to authenticated;

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  author_handle text not null default '',
  body text not null check (
    char_length(body) between 1 and 500
    and body !~* '(^|[^[:alnum:]])https?://[^[:space:]]+'
    and body !~* '(^|[^[:alnum:]])www[.][^[:space:]]+'
    and body !~* '(^|[^[:alnum:]_@/])([[:alnum:]]([[:alnum:]-]{0,61}[[:alnum:]])?[.])+[[:alpha:]]{2,}(:[0-9]{1,5})?([/?#][^[:space:]]*)?($|[^[:alnum:]_-])'
  ),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create index chat_messages_room_created_at_idx
  on public.chat_messages (room_id, created_at desc);
create policy "messages read" on public.chat_messages
  for select to authenticated
  using (
    (
      (select public.is_moderator())
      or (
        exists (
          select 1
          from public.profiles p
          where p.id = (select auth.uid())
            and p.adult_confirmed
        )
        and not hidden
      )
    )
    and (
      (select public.is_moderator())
      or not exists (
        select 1
        from public.chat_blocks b
        where b.blocker_id = (select auth.uid())
          and b.blocked_handle = chat_messages.author_handle
      )
    )
  );
create policy "messages insert adult" on public.chat_messages
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.adult_confirmed
    )
  );
create policy "messages update moderator" on public.chat_messages
  for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));
create policy "messages delete moderator" on public.chat_messages
  for delete to authenticated
  using ((select public.is_moderator()));
revoke all on table public.chat_messages from public, anon, authenticated;
grant select, insert on table public.chat_messages to authenticated;
grant update (hidden), delete on table public.chat_messages to authenticated;

create or replace function public.chat_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  h text;
  recent int;
begin
  select p.handle
  into h
  from public.profiles p
  where p.id = (select auth.uid())
  for update;

  if h is null then
    raise exception 'no profile';
  end if;

  new.author_handle := h;
  new.hidden := false;
  new.created_at := pg_catalog.now();

  select pg_catalog.count(*)::int
  into recent
  from public.chat_messages m
  where m.author_handle = h
    and m.created_at > pg_catalog.now() - interval '60 seconds';

  if recent >= 10 then
    raise exception 'rate limit';
  end if;

  return new;
end;
$$;
revoke all on function public.chat_before_insert() from public, anon, authenticated;

create trigger chat_messages_before_insert
  before insert on public.chat_messages
  for each row execute function public.chat_before_insert();

create table public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  reason text not null
    check (reason in ('harassment', 'spam', 'unsafe_advice', 'personal_info', 'other')),
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);
alter table public.chat_reports enable row level security;
create policy "reports insert" on public.chat_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.adult_confirmed
    )
  );
create policy "reports read own or mod" on public.chat_reports
  for select to authenticated
  using (
    (select public.is_moderator())
    or (
      reporter_id = (select auth.uid())
      and exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.adult_confirmed
      )
    )
  );
revoke all on table public.chat_reports from public, anon, authenticated;
grant select, insert on table public.chat_reports to authenticated;

create or replace function public.chat_after_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select pg_catalog.count(distinct r.reporter_id)
    from public.chat_reports r
    where r.message_id = new.message_id
  ) >= 3 then
    update public.chat_messages
    set hidden = true
    where id = new.message_id;
  end if;

  return new;
end;
$$;
revoke all on function public.chat_after_report() from public, anon, authenticated;

create trigger chat_reports_after_insert
  after insert on public.chat_reports
  for each row execute function public.chat_after_report();

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    raise exception
      'Supabase Realtime publication supabase_realtime is missing; enable Realtime for chat_messages and rerun this migration';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end;
$$;
