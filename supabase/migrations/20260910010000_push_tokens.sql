-- Expo push tokens, one row per device per user. The notify-proof edge
-- function (service role) reads these to fan out notifications.

create table public.push_tokens (
  user_id    uuid not null references auth.users (id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "push_tokens: own rows"
  on public.push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Used by the notify-proof edge function (service role) to resolve a group
-- member's display name to their registered device tokens.
create or replace function public.push_tokens_for_group_member(
  p_group_id uuid,
  p_member   text
)
returns table (token text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select pt.token
  from public.group_members gm
  join auth.users u on lower(u.email) = lower(gm.email)
  join public.push_tokens pt on pt.user_id = u.id
  where gm.group_id = p_group_id and gm.name = p_member;
$$;

revoke all on function public.push_tokens_for_group_member(uuid, text)
  from public, anon, authenticated;
