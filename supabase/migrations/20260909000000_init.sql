-- Kongsi — initial schema
--
-- Ports the prototype's `window.storage` blobs to relational tables.
-- Identity model (see PROJECT_BRIEF "Member identity rule"): a person's access
-- to a group is decided purely by whether their auth email appears in that
-- group's `group_members`. The 6-digit PIN is a second, shared gate checked
-- client-side after identity is established.
--
-- Naming: DB columns are snake_case; the TypeScript domain layer uses camelCase.
-- The mapping lives in src/lib/ (repositories) — see docs/ARCHITECTURE.md.

create extension if not exists "pgcrypto";

-- Helper functions below reference tables that are created later in this file.
-- LANGUAGE sql validates its body at creation time, so defer that check for
-- the whole migration (Supabase's own generated migrations do the same).
set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Lowercased email from the caller's JWT.
create or replace function public.current_email()
returns text
language sql
stable
as $$
  select lower(nullif(auth.jwt() ->> 'email', ''));
$$;

-- Is the caller a member of this group? SECURITY DEFINER so it can read
-- group_members without tripping that table's own RLS (avoids recursion).
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
  );
$$;

-- The caller's display name inside a group (null if not a member).
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
  limit 1;
$$;

-- group_id that owns a bill (used by RLS on per-month tables).
create or replace function public.bill_group(bid uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.group_id from public.bills b where b.id = bid;
$$;

-- 5-char join code, no ambiguous glyphs (matches the prototype alphabet).
create or replace function public.gen_group_code()
returns text
language plpgsql
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
begin
  loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code
        || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    -- qualify the column so it can't clash with the v_code variable
    exit when not exists (
      select 1 from public.groups g where g.code = v_code
    );
  end loop;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users — holds the WhatsApp number)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  wa         text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: upsert own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  pin        text not null check (pin ~ '^[0-9]{6}$'),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

-- Only members can see a group. A non-member with the code sees nothing —
-- the code just tells the client which group to ask for.
create policy "groups: members read"
  on public.groups for select
  using (is_group_member(id));

-- Group creation goes through create_group() (SECURITY DEFINER). A direct
-- insert is still allowed for the creator, but has no members yet so only
-- they (as created_by) can act on it until members are added.
create policy "groups: creator inserts"
  on public.groups for insert
  with check (created_by = auth.uid());

-- Rename / change PIN: admin (creator) only. No delete policy — deleting a
-- group is deliberately not a feature (Home only forgets it from your list).
create policy "groups: admin updates"
  on public.groups for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- group_members   (name + email; email is the identity key)
-- ---------------------------------------------------------------------------

create table public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  name       text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

create unique index group_members_group_email_idx
  on public.group_members (group_id, lower(email));

-- keep emails normalised
create or replace function public.group_members_normalise_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

create trigger group_members_normalise_email
  before insert or update on public.group_members
  for each row execute function public.group_members_normalise_email();

alter table public.group_members enable row level security;

create policy "group_members: members read"
  on public.group_members for select
  using (is_group_member(group_id));

-- Adding / editing / removing members after creation: admin only.
create policy "group_members: admin writes"
  on public.group_members for all
  using (exists (
    select 1 from public.groups g
    where g.id = group_members.group_id and g.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.groups g
    where g.id = group_members.group_id and g.created_by = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- bills
-- ---------------------------------------------------------------------------

create table public.bills (
  id                 uuid primary key default gen_random_uuid(),
  group_id           uuid not null references public.groups (id) on delete cascade,
  name               text not null,
  category           text not null check (category in
                       ('Listrik','Air','WiFi','Tagihan Rumah','Cicilan','Lainnya')),
  type               text not null check (type in ('single','split')),
  responsible        text not null,
  split_members      text[] not null default '{}',
  estimate           bigint not null check (estimate >= 0),
  due_day            int not null check (due_day between 1 and 31),
  due_month          int not null check (due_month between 1 and 12),
  due_year           int not null,
  -- Cicilan-only (null unless category = 'Cicilan')
  tenor              int check (tenor is null or tenor > 0),
  paid_count         int not null default 0 check (paid_count >= 0),
  installment_total  bigint,
  lender             text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint bills_split_has_members
    check (type <> 'split' or array_length(split_members, 1) >= 2),
  constraint bills_tenor_only_for_cicilan
    check (tenor is null or category = 'Cicilan')
);

create index bills_group_idx on public.bills (group_id);

alter table public.bills enable row level security;

-- Any member of the group can read and add bills (matches the prototype).
create policy "bills: members read"
  on public.bills for select
  using (is_group_member(group_id));

create policy "bills: members insert"
  on public.bills for insert
  with check (is_group_member(group_id));

-- Update is allowed for any member OR the responsible member. The
-- "only the responsible member may change the nominal" rule from the brief is
-- enforced in the UI; tighten here with a trigger later if it needs teeth.
create policy "bills: members update"
  on public.bills for update
  using (is_group_member(group_id))
  with check (is_group_member(group_id));

create policy "bills: members delete"
  on public.bills for delete
  using (is_group_member(group_id));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger bills_touch_updated_at
  before update on public.bills
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- bill_months   (per bill, per YYYY-MM: nominal override + advance guard)
-- ---------------------------------------------------------------------------

create table public.bill_months (
  bill_id              uuid not null references public.bills (id) on delete cascade,
  month                text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount               bigint,                       -- null => use bills.estimate
  installment_advanced boolean not null default false,
  updated_at           timestamptz not null default now(),
  primary key (bill_id, month)
);

alter table public.bill_months enable row level security;

create policy "bill_months: members all"
  on public.bill_months for all
  using (is_group_member(bill_group(bill_id)))
  with check (is_group_member(bill_group(bill_id)));

create trigger bill_months_touch_updated_at
  before update on public.bill_months
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- payments   (per bill, per month, per member)
-- ---------------------------------------------------------------------------

create table public.payments (
  bill_id     uuid not null references public.bills (id) on delete cascade,
  month       text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  member      text not null,
  status      text not null default 'unpaid'
                check (status in ('unpaid','paid','review','awaiting')),
  amount      bigint,
  proof_path  text,           -- object path in the `proofs` storage bucket
  ocr_matched boolean,
  uploaded_at timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (bill_id, month, member)
);

alter table public.payments enable row level security;

create policy "payments: members all"
  on public.payments for all
  using (is_group_member(bill_group(bill_id)))
  with check (is_group_member(bill_group(bill_id)));

create trigger payments_touch_updated_at
  before update on public.payments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- recent_groups   (per-user "Lanjutkan" list — hide != delete the group)
-- ---------------------------------------------------------------------------

create table public.recent_groups (
  user_id   uuid not null references auth.users (id) on delete cascade,
  group_id  uuid not null references public.groups (id) on delete cascade,
  opened_at timestamptz not null default now(),
  hidden    boolean not null default false,
  primary key (user_id, group_id)
);

alter table public.recent_groups enable row level security;

create policy "recent_groups: own rows"
  on public.recent_groups for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- create_group RPC  (atomic group + members insert)
-- ---------------------------------------------------------------------------

-- p_members: jsonb array of { "name": "...", "email": "..." }, min 2 entries.
-- The caller must appear among the members (by email) — you can't create a
-- group you're not in.
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
    insert into public.group_members (group_id, name, email)
    values (v_group.id, trim(v_member ->> 'name'), lower(trim(v_member ->> 'email')));
  end loop;

  return v_group;
end;
$$;

revoke all on function public.create_group(text, text, jsonb) from public;
grant execute on function public.create_group(text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- get_group_for_join RPC
-- Resolve a join code to a group + the caller's membership. Returns the group
-- name even to non-members (they have the code) so the UI can say "email kamu
-- belum terdaftar sebagai anggota grup <name>". Raises if the code is unknown.
-- ---------------------------------------------------------------------------

create or replace function public.get_group_for_join(p_code text)
returns table (group_id uuid, name text, member_name text)
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
    select v_group.id,
           v_group.name,
           (select m.name from public.group_members m
              where m.group_id = v_group.id
                and lower(m.email) = public.current_email()
              limit 1);
end;
$$;

revoke all on function public.get_group_for_join(text) from public;
grant execute on function public.get_group_for_join(text) to authenticated;

-- ---------------------------------------------------------------------------
-- duplicate_group RPC
-- "Duplikat" from Home: new group, same name + " (Salinan)", same members,
-- NO bills / history (matches the prototype). Caller must be a member.
-- ---------------------------------------------------------------------------

create or replace function public.duplicate_group(p_group_id uuid)
returns public.groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_src   public.groups;
  v_group public.groups;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Kamu bukan anggota grup ini';
  end if;

  select * into v_src from public.groups where id = p_group_id;

  insert into public.groups (code, name, pin, created_by)
  values (public.gen_group_code(), v_src.name || ' (Salinan)', v_src.pin, auth.uid())
  returning * into v_group;

  insert into public.group_members (group_id, name, email)
  select v_group.id, m.name, m.email
  from public.group_members m
  where m.group_id = p_group_id;

  return v_group;
end;
$$;

revoke all on function public.duplicate_group(uuid) from public;
grant execute on function public.duplicate_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: proof-of-transfer images
-- Path convention: <group_id>/<bill_id>/<month>/<member>.jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

create policy "proofs: members read"
  on storage.objects for select
  using (
    bucket_id = 'proofs'
    and is_group_member(((storage.foldername(name))[1])::uuid)
  );

create policy "proofs: members write"
  on storage.objects for insert
  with check (
    bucket_id = 'proofs'
    and is_group_member(((storage.foldername(name))[1])::uuid)
  );

create policy "proofs: members update"
  on storage.objects for update
  using (
    bucket_id = 'proofs'
    and is_group_member(((storage.foldername(name))[1])::uuid)
  );

-- needed for "Upload ulang" (replace a blurry proof) and "Tolak"
create policy "proofs: members delete"
  on storage.objects for delete
  using (
    bucket_id = 'proofs'
    and is_group_member(((storage.foldername(name))[1])::uuid)
  );
