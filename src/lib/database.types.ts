/**
 * Hand-written row types for the Kongsi schema (see
 * supabase/migrations/0001_init.sql). The Supabase client is left untyped
 * (`SupabaseClient` with the default schema) because a correct generated
 * `Database` type can't be produced without a live project — the repositories
 * cast `.select()` results to these row types instead.
 *
 * Once a project exists, run:
 *   supabase gen types typescript --linked > src/lib/database.types.ts
 * then add `<Database>` to `createClient` in supabase.ts and drop the casts.
 */

export interface ProfileRow {
  id: string;
  wa: string;
  created_at: string;
}

export interface GroupRow {
  id: string;
  code: string;
  name: string;
  pin: string;
  created_by: string;
  created_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  name: string;
  email: string;
  created_at: string;
}

export type BillCategoryDb =
  | 'Listrik'
  | 'Air'
  | 'WiFi'
  | 'Tagihan Rumah'
  | 'Cicilan'
  | 'Lainnya';

export interface BillRow {
  id: string;
  group_id: string;
  name: string;
  category: BillCategoryDb;
  type: 'single' | 'split';
  responsible: string;
  split_members: string[];
  estimate: number;
  due_day: number;
  due_month: number;
  due_year: number;
  tenor: number | null;
  paid_count: number;
  installment_total: number | null;
  lender: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillMonthRow {
  bill_id: string;
  month: string;
  amount: number | null;
  installment_advanced: boolean;
  updated_at: string;
}

export interface PaymentRow {
  bill_id: string;
  month: string;
  member: string;
  status: 'unpaid' | 'paid' | 'review' | 'awaiting';
  amount: number | null;
  proof_path: string | null;
  ocr_matched: boolean | null;
  is_receipt: boolean | null;
  platform: string | null;
  suspicious_note: string | null;
  uploaded_at: string | null;
  updated_at: string;
}

export interface RecentGroupRow {
  user_id: string;
  group_id: string;
  opened_at: string;
  hidden: boolean;
}

/** Shape returned by the `get_group_for_join` RPC. */
export interface JoinLookupRow {
  group_id: string;
  name: string;
  member_name: string | null;
}
