alter table public.chat_reports
  add column status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null;

drop policy "reports insert" on public.chat_reports;
create policy "reports insert eligible visible post"
  on public.chat_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.adult_confirmed
    )
    and exists (
      select 1
      from public.chat_messages m
      where m.id = message_id
        and not m.hidden
        and not exists (
          select 1
          from public.chat_blocks b
          where b.blocker_id = (select auth.uid())
            and b.blocked_handle = m.author_handle
        )
    )
  );

drop policy "reports read own or mod" on public.chat_reports;
create policy "reports moderator read"
  on public.chat_reports
  for select to authenticated
  using ((select public.is_moderator()));

revoke insert, select on table public.chat_reports from authenticated;
grant insert (message_id, reason) on table public.chat_reports to authenticated;
grant select on table public.chat_reports to authenticated;

alter table public.chat_message_comments
  add column is_hidden boolean not null default false;

drop policy "message comments read permitted" on public.chat_message_comments;
create policy "message comments read permitted"
  on public.chat_message_comments
  for select to authenticated
  using (
    not is_hidden
    and (
      (select public.is_moderator())
      or (
        exists (
          select 1
          from public.profiles p
          where p.id = (select auth.uid())
            and p.adult_confirmed
        )
        and exists (
          select 1
          from public.chat_messages m
          where m.id = post_id
            and not m.hidden
            and not exists (
              select 1
              from public.chat_blocks b
              where b.blocker_id = (select auth.uid())
                and b.blocked_handle = m.author_handle
            )
        )
      )
    )
  );

create table public.chat_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.chat_message_comments(id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  reason text not null
    check (reason in ('harassment', 'spam', 'unsafe_advice', 'personal_info', 'other')),
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (comment_id, reporter_id)
);

alter table public.chat_comment_reports enable row level security;
create index chat_reports_open_created_idx
  on public.chat_reports (created_at desc)
  where status = 'open';
create index chat_comment_reports_open_created_idx
  on public.chat_comment_reports (created_at desc)
  where status = 'open';

create policy "comment reports insert eligible visible comment"
  on public.chat_comment_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.adult_confirmed
    )
    and exists (
      select 1
      from public.chat_message_comments c
      join public.chat_messages m on m.id = c.post_id
      where c.id = comment_id
        and not c.is_hidden
        and not m.hidden
        and not exists (
          select 1
          from public.chat_blocks b
          where b.blocker_id = (select auth.uid())
            and b.blocked_handle = m.author_handle
        )
    )
  );

create policy "comment reports moderator read"
  on public.chat_comment_reports
  for select to authenticated
  using ((select public.is_moderator()));

revoke all on table public.chat_comment_reports from public, anon, authenticated;
grant insert (comment_id, reason) on table public.chat_comment_reports to authenticated;
grant select on table public.chat_comment_reports to authenticated;

create or replace function public.list_community_moderation_reports()
returns table (
  report_id uuid,
  content_type text,
  target_id uuid,
  post_id uuid,
  content text,
  context text,
  reason text,
  created_at timestamptz,
  is_hidden boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_moderator()) then
    raise exception 'Moderator access required'
      using errcode = '42501';
  end if;

  return query
  select
    r.id,
    'post'::text,
    m.id,
    m.id,
    m.body,
    null::text,
    r.reason,
    r.created_at,
    m.hidden
  from public.chat_reports r
  join public.chat_messages m on m.id = r.message_id
  where r.status = 'open'
  union all
  select
    r.id,
    'comment'::text,
    c.id,
    c.post_id,
    c.body,
    m.body,
    r.reason,
    r.created_at,
    c.is_hidden
  from public.chat_comment_reports r
  join public.chat_message_comments c on c.id = r.comment_id
  join public.chat_messages m on m.id = c.post_id
  where r.status = 'open'
  order by 8 desc;
end;
$$;

create or replace function public.review_community_report(
  requested_content_type text,
  requested_report_id uuid,
  requested_resolution text,
  requested_hidden boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if not (select public.is_moderator()) then
    raise exception 'Moderator access required'
      using errcode = '42501';
  end if;

  if requested_resolution not in ('resolved', 'dismissed') then
    raise exception 'Invalid report resolution'
      using errcode = '22023';
  end if;

  if requested_content_type = 'post' then
    select r.message_id into target_id
    from public.chat_reports r
    where r.id = requested_report_id
      and r.status = 'open'
    for update;

    if target_id is null then
      raise exception 'Open post report not found'
        using errcode = 'P0002';
    end if;

    update public.chat_messages
    set hidden = requested_hidden
    where id = target_id;

    update public.chat_reports
    set status = requested_resolution,
        reviewed_at = pg_catalog.now(),
        reviewed_by = (select auth.uid())
    where id = requested_report_id;
  elsif requested_content_type = 'comment' then
    select r.comment_id into target_id
    from public.chat_comment_reports r
    where r.id = requested_report_id
      and r.status = 'open'
    for update;

    if target_id is null then
      raise exception 'Open comment report not found'
        using errcode = 'P0002';
    end if;

    update public.chat_message_comments
    set is_hidden = requested_hidden
    where id = target_id;

    update public.chat_comment_reports
    set status = requested_resolution,
        reviewed_at = pg_catalog.now(),
        reviewed_by = (select auth.uid())
    where id = requested_report_id;
  else
    raise exception 'Invalid community content type'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.list_community_moderation_reports() from public, anon;
grant execute on function public.list_community_moderation_reports() to authenticated;
revoke all on function public.review_community_report(text, uuid, text, boolean) from public, anon;
grant execute on function public.review_community_report(text, uuid, text, boolean) to authenticated;
