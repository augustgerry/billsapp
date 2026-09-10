-- Point 4: group invitations should land on the invitee's Home live.
-- Point 1: "Duplikat" from the kebab menu can rename the new group.

-- ---------------------------------------------------------------------------
-- 1. Realtime: broadcast group_members changes
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.group_members;
exception when duplicate_object then null;
end $$;

-- A pending invitee is NOT an active member, so `is_group_member` (active-only)
-- hides their own invite row — which also means Realtime won't deliver it.
-- Let a signed-in user always read their OWN membership rows (by email),
-- pending or active, in any group. This is their own data.
create policy "group_members: read own rows by email"
  on public.group_members for select
  using (lower(email) = public.current_email());

-- ---------------------------------------------------------------------------
-- 2. duplicate_group: optional new name
-- ---------------------------------------------------------------------------

drop function if exists public.duplicate_group(uuid);

create function public.duplicate_group(
  p_group_id uuid,
  p_name     text default null
)
returns public.groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_src    public.groups;
  v_group  public.groups;
  v_caller text := public.current_email();
  v_name   text;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Kamu bukan anggota grup ini';
  end if;

  select * into v_src from public.groups where id = p_group_id;

  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    v_name := v_src.name || ' (Salinan)';
  end if;

  insert into public.groups (code, name, pin, created_by)
  values (public.gen_group_code(), v_name, v_src.pin, auth.uid())
  returning * into v_group;

  insert into public.group_members (group_id, name, email, status)
  select v_group.id, m.name, m.email,
         case when lower(m.email) = v_caller then 'active' else 'pending' end
  from public.group_members m
  where m.group_id = p_group_id;

  return v_group;
end;
$$;

revoke all on function public.duplicate_group(uuid, text) from public;
grant execute on function public.duplicate_group(uuid, text) to authenticated;
