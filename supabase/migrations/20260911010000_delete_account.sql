-- Account deletion (App Store requirement).
--
-- `delete_my_account_data()` unwinds everything this account touches so the
-- auth user can then be removed by the `delete-account` edge function
-- (service role -> auth.admin.deleteUser). It runs as the CALLER (needs
-- auth.uid()) but is SECURITY DEFINER so it can read auth.users to pick a
-- new owner for any group the caller admins.
--
-- Rule from the brief: a group that still has other members stays; only this
-- user's membership goes. A group with nobody else left is removed.

create or replace function public.delete_my_account_data()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := public.current_email();
  v_gid   uuid;
  v_heir  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Every group this account created: hand it to another active member, or
  -- delete it if there is no one else.
  for v_gid in
    select id from public.groups where created_by = v_uid
  loop
    select u.id
      into v_heir
    from public.group_members m
    join auth.users u on lower(u.email) = lower(m.email)
    where m.group_id = v_gid
      and m.status = 'active'
      and lower(m.email) <> v_email
    order by m.created_at
    limit 1;

    if v_heir is not null then
      update public.groups set created_by = v_heir where id = v_gid;
    else
      delete from public.groups where id = v_gid;  -- cascades bills/members/…
    end if;

    v_heir := null;
  end loop;

  -- Drop this account's membership from every remaining group.
  delete from public.group_members where lower(email) = v_email;

  -- Personal rows. auth.users FK cascade also covers these, but being explicit
  -- keeps the function correct even if a cascade is ever loosened.
  delete from public.profiles       where id = v_uid;
  delete from public.push_tokens    where user_id = v_uid;
  delete from public.recent_groups  where user_id = v_uid;
end;
$$;

revoke all on function public.delete_my_account_data() from public, anon;
grant execute on function public.delete_my_account_data() to authenticated;
