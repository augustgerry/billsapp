-- Enforce "only the responsible member may change a bill's nominal" at the DB
-- level, not just in the UI. Other columns (paid_count from installment
-- advancement, etc.) are unaffected.

create or replace function public.bills_guard_estimate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estimate is distinct from old.estimate
     and public.current_member_name(old.group_id) is distinct from old.responsible
  then
    raise exception
      'Hanya penanggung jawab (%) yang bisa mengubah nominal tagihan', old.responsible
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger bills_guard_estimate
  before update on public.bills
  for each row execute function public.bills_guard_estimate();
