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

    if requested_resolution = 'resolved' then
      update public.chat_messages
      set hidden = requested_hidden
      where id = target_id;
    end if;

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

    if requested_resolution = 'resolved' then
      update public.chat_message_comments
      set is_hidden = requested_hidden
      where id = target_id;
    end if;

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

create or replace function public.list_hidden_community_content()
returns table (
  content_type text,
  target_id uuid,
  post_id uuid,
  content text,
  context text
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
    'post'::text,
    m.id,
    m.id,
    m.body,
    null::text
  from public.chat_messages m
  where m.hidden
  union all
  select
    'comment'::text,
    c.id,
    c.post_id,
    c.body,
    m.body
  from public.chat_message_comments c
  join public.chat_messages m on m.id = c.post_id
  where c.is_hidden
  order by 1, 2;
end;
$$;

create or replace function public.set_community_content_visibility(
  requested_content_type text,
  requested_target_id uuid,
  requested_hidden boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows int;
begin
  if not (select public.is_moderator()) then
    raise exception 'Moderator access required'
      using errcode = '42501';
  end if;

  if requested_content_type = 'post' then
    update public.chat_messages
    set hidden = requested_hidden
    where id = requested_target_id;
  elsif requested_content_type = 'comment' then
    update public.chat_message_comments
    set is_hidden = requested_hidden
    where id = requested_target_id;
  else
    raise exception 'Invalid community content type'
      using errcode = '22023';
  end if;

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Community content not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.review_community_report(text, uuid, text, boolean) from public, anon;
grant execute on function public.review_community_report(text, uuid, text, boolean) to authenticated;
revoke all on function public.list_hidden_community_content() from public, anon;
grant execute on function public.list_hidden_community_content() to authenticated;
revoke all on function public.set_community_content_visibility(text, uuid, boolean) from public, anon;
grant execute on function public.set_community_content_visibility(text, uuid, boolean) to authenticated;
