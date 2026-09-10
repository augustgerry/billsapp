-- Member invitation flow: added members are `pending` until they accept.
-- Existing rows default to `active` (they were added before invites existed).

alter table public.group_members
  add column if not exists status text not null default 'active'
    check (status in ('pending', 'active'));

-- Group access (RLS + business logic) is for ACTIVE members only. Pending
-- members reach their invite via the SECURITY DEFINER RPCs below.
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.group_members m
    where m.group_id = gid
      and lower(m.email) = public.current_email()
      and m.status = 'active'
  );
$$;

create or replace function public.current_member_name(gid uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.name
  from public.group_members m
  where m.group_id = gid
    and lower(m.email) = public.current_email()
    and m.status = 'active'
  limit 1;
$$;

-- --- create_group: creator active, everyone else pending -------------------

create or replace function public.create_group(
  p_name    text,
  p_pin     text,
  p_members jsonb
)
returns public.groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group  public.groups;
  v_code   text;
  v_member jsonb;
  v_count  int;
  v_caller text := public.current_email();
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN harus 6 digit angka';
  end if;

  v_count := jsonb_array_length(p_members);
  if v_count is null or v_count < 2 then
    raise exception 'Minimal 2 anggota';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(p_members) e
    where lower(e ->> 'email') = v_caller
  ) then
    raise exception 'Email kamu harus termasuk dalam daftar anggota';
  end if;

  v_code := public.gen_group_code();

  insert into public.groups (code, name, pin, created_by)
  values (v_code, p_name, p_pin, auth.uid())
  returning * into v_group;

  for v_member in select * from jsonb_array_elements(p_members)
  loop
    insert into public.group_members (group_id, name, email, status)
    values (
      v_group.id,
      trim(v_member ->> 'name'),
      lower(trim(v_member ->> 'email')),
      case when lower(trim(v_member ->> 'email')) = v_caller
           then 'active' else 'pending' end
    );
  end loop;

  return v_group;
end;
$$;

-- --- duplicate_group: same, caller active / rest re-invited ---------------

create or replace function public.duplicate_group(p_group_id uuid)
returns public.groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_src    public.groups;
  v_group  public.groups;
  v_caller text := public.current_email();
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Kamu bukan anggota grup ini';
  end if;

  select * into v_src from public.groups where id = p_group_id;

  insert into public.groups (code, name, pin, created_by)
  values (public.gen_group_code(), v_src.name || ' (Salinan)', v_src.pin, auth.uid())
  returning * into v_group;

  insert into public.group_members (group_id, name, email, status)
  select v_group.id, m.name, m.email,
         case when lower(m.email) = v_caller then 'active' else 'pending' end
  from public.group_members m
  where m.group_id = p_group_id;

  return v_group;
end;
$$;

-- --- get_group_for_join: also report the caller's member status ----------

drop function if exists public.get_group_for_join(text);
create function public.get_group_for_join(p_code text)
returns table (group_id uuid, name text, member_name text, member_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group public.groups;
begin
  select * into v_group from public.groups g
    where upper(g.code) = upper(trim(p_code));
  if not found then
    raise exception 'Kode grup tidak ditemukan';
  end if;

  return query
    select v_group.id, v_group.name,
           m.name, m.status
    from public.group_members m
    where m.group_id = v_group.id
      and lower(m.email) = public.current_email()
    limit 1;

  if not found then
    return query select v_group.id, v_group.name, null::text, null::text;
  end if;
end;
$$;

revoke all on function public.get_group_for_join(text) from public;
grant execute on function public.get_group_for_join(text) to authenticated;

-- --- list_my_invites: groups where I'm still pending ---------------------

create or replace function public.list_my_invites()
returns table (group_id uuid, name text, code text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select g.id, g.name, g.code
  from public.group_members m
  join public.groups g on g.id = m.group_id
  where lower(m.email) = public.current_email()
    and m.status = 'pending'
  order by m.created_at desc;
$$;

revoke all on function public.list_my_invites() from public;
grant execute on function public.list_my_invites() to authenticated;

-- --- respond_to_invite: accept (-> active) or reject (-> row deleted) ----

create or replace function public.respond_to_invite(
  p_group_id uuid,
  p_accept   boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller text := public.current_email();
begin
  if p_accept then
    update public.group_members
      set status = 'active'
      where group_id = p_group_id
        and lower(email) = v_caller
        and status = 'pending';
    if not found then
      raise exception 'Undangan tidak ditemukan atau sudah diterima';
    end if;
  else
    delete from public.group_members
      where group_id = p_group_id
        and lower(email) = v_caller
        and status = 'pending';
  end if;
end;
$$;

revoke all on function public.respond_to_invite(uuid, boolean) from public;
grant execute on function public.respond_to_invite(uuid, boolean) to authenticated;
