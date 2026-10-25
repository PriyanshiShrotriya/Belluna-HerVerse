create table public.chat_message_likes (
  post_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.chat_message_likes enable row level security;

create policy "message likes read own"
  on public.chat_message_likes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "message likes insert eligible"
  on public.chat_message_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
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

create policy "message likes delete own"
  on public.chat_message_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.chat_message_likes from public, anon, authenticated;
grant select (post_id) on table public.chat_message_likes to authenticated;
grant insert (post_id) on table public.chat_message_likes to authenticated;
grant delete on table public.chat_message_likes to authenticated;

create index chat_message_likes_post_id_idx
  on public.chat_message_likes (post_id);
