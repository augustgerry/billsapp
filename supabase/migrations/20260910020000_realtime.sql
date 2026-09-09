-- Broadcast row changes on the payment ledger so open group dashboards
-- refresh live. RLS still applies — a client only receives rows it may SELECT.

do $$
begin
  alter publication supabase_realtime add table public.payments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.bill_months;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.bills;
exception when duplicate_object then null;
end $$;
