create table public.chat_message_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.chat_messages(id) on delete cascade,
  author_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  author_handle text not null default '',
  body text not null check (
    char_length(body) between 1 and 200
    and body = pg_catalog.btrim(body)
    and body !~* '(^|[^[:alnum:]])https?://[^[:space:]]+'
    and body !~* '(^|[^[:alnum:]])www[.][^[:space:]]+'
    and body !~* '(^|[^[:alnum:]_@/])([[:alnum:]]([[:alnum:]-]{0,61}[[:alnum:]])?[.])+[[:alpha:]]{2,}(:[0-9]{1,5})?([/?#][^[:space:]]*)?($|[^[:alnum:]_-])'
  ),
  created_at timestamptz not null default now()
);

alter table public.chat_message_comments enable row level security;

create index chat_message_comments_post_created_idx
  on public.chat_message_comments (post_id, created_at);

create policy "message comments read permitted"
  on public.chat_message_comments
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

create policy "message comments insert eligible"
  on public.chat_message_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
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
  );

create policy "message comments update owner or moderator"
  on public.chat_message_comments
  for update to authenticated
  using (
    author_id = (select auth.uid())
    or (select public.is_moderator())
  )
  with check (
    author_id = (select auth.uid())
    or (select public.is_moderator())
  );

create policy "message comments delete owner or moderator"
  on public.chat_message_comments
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or (select public.is_moderator())
  );

revoke all on table public.chat_message_comments from public, anon, authenticated;
grant select (id, post_id, author_handle, body, created_at)
  on table public.chat_message_comments to authenticated;
grant insert (post_id, body)
  on table public.chat_message_comments to authenticated;
grant update (body) on table public.chat_message_comments to authenticated;
grant delete on table public.chat_message_comments to authenticated;

create or replace function public.set_chat_comment_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_handle text;
  is_adult boolean;
  recent_comments int;
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  select p.handle, p.adult_confirmed
  into current_handle, is_adult
  from public.profiles p
  where p.id = current_user_id
  for update;

  if current_handle is null or not coalesce(is_adult, false) then
    raise exception 'Eligible chat profile required'
      using errcode = '42501';
  end if;

  select pg_catalog.count(*)::int
  into recent_comments
  from public.chat_message_comments c
  where c.author_id = current_user_id
    and c.created_at > pg_catalog.now() - interval '60 seconds';

  if recent_comments >= 10 then
    raise exception 'comment rate limit'
      using errcode = 'P0001';
  end if;

  new.author_id := current_user_id;
  new.author_handle := current_handle;
  new.created_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_chat_comment_author() from public, anon, authenticated;

create trigger chat_message_comments_set_author
  before insert on public.chat_message_comments
  for each row execute function public.set_chat_comment_author();

create or replace function public.get_community_post_engagement(requested_post_ids uuid[])
returns table (
  post_id uuid,
  like_count bigint,
  liked_by_me boolean,
  comment_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    (
      select pg_catalog.count(*)
      from public.chat_message_likes l
      where l.post_id = m.id
    ),
    exists (
      select 1
      from public.chat_message_likes l
      where l.post_id = m.id
        and l.user_id = (select auth.uid())
    ),
    (
      select pg_catalog.count(*)
      from public.chat_message_comments c
      where c.post_id = m.id
    )
  from pg_catalog.unnest(coalesce(requested_post_ids, array[]::uuid[])) requested(id)
  join public.chat_messages m on m.id = requested.id
  where (select auth.uid()) is not null
    and (
      (select public.is_moderator())
      or (
        exists (
          select 1
          from public.profiles p
          where p.id = (select auth.uid())
            and p.adult_confirmed
        )
        and not m.hidden
        and not exists (
          select 1
          from public.chat_blocks b
          where b.blocker_id = (select auth.uid())
            and b.blocked_handle = m.author_handle
        )
      )
    );
$$;

revoke all on function public.get_community_post_engagement(uuid[]) from public, anon;
grant execute on function public.get_community_post_engagement(uuid[]) to authenticated;
