/**
 * Per-month payment ledger: loading `MonthRecord`s and persisting the results
 * of domain events (`applyProofUpload`, `applyConfirm`, ...).
 */

import type { Bill, BillId, Group, MonthKey, MonthRecord } from '@/types/models';
import { supabase } from './supabase';
import { assembleMonth, billMonthToRow, paymentToRow } from './mappers';

async function billIdsForGroup(groupId: string): Promise<BillId[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('id')
    .eq('group_id', groupId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id);
}

/** Load one month's records for every bill in the group. */
export async function loadMonth(
  groupId: string,
  month: MonthKey,
): Promise<Record<BillId, MonthRecord>> {
  const billIds = await billIdsForGroup(groupId);
  if (billIds.length === 0) return {};
  const [billMonths, payments] = await Promise.all([
    supabase
      .from('bill_months')
      .select('*')
      .in('bill_id', billIds)
      .eq('month', month),
    supabase
      .from('payments')
      .select('*')
      .in('bill_id', billIds)
      .eq('month', month),
  ]);
  if (billMonths.error) throw new Error(billMonths.error.message);
  if (payments.error) throw new Error(payments.error.message);
  return assembleMonth(billMonths.data ?? [], payments.data ?? []);
}

/** Load every month (for the trend chart / export). */
export async function loadAllMonths(
  groupId: string,
): Promise<Group['monthly']> {
  const billIds = await billIdsForGroup(groupId);
  if (billIds.length === 0) return {};
  const [billMonths, payments] = await Promise.all([
    supabase.from('bill_months').select('*').in('bill_id', billIds),
    supabase.from('payments').select('*').in('bill_id', billIds),
  ]);
  if (billMonths.error) throw new Error(billMonths.error.message);
  if (payments.error) throw new Error(payments.error.message);

  const billMonthRows = billMonths.data ?? [];
  const paymentRows = payments.data ?? [];
  const byMonth: Group['monthly'] = {};
  const months = new Set<MonthKey>([
    ...billMonthRows.map((r) => r.month),
    ...paymentRows.map((r) => r.month),
  ]);
  for (const month of months) {
    byMonth[month] = assembleMonth(
      billMonthRows.filter((r) => r.month === month),
      paymentRows.filter((r) => r.month === month),
    );
  }
  return byMonth;
}

/**
 * Persist a `MonthRecord` (bill_months + every member payment). Idempotent —
 * safe to call with the full record after any domain event.
 */
export async function writeMonthRecord(
  billId: BillId,
  month: MonthKey,
  record: MonthRecord,
): Promise<void> {
  const bmRes = await supabase
    .from('bill_months')
    .upsert(billMonthToRow(billId, month, record), { onConflict: 'bill_id,month' });
  if (bmRes.error) throw new Error(bmRes.error.message);

  const rows = Object.entries(record.payments).map(([member, payment]) =>
    paymentToRow(billId, month, member, payment),
  );
  if (rows.length > 0) {
    const pRes = await supabase
      .from('payments')
      .upsert(rows, { onConflict: 'bill_id,month,member' });
    if (pRes.error) throw new Error(pRes.error.message);
  }
}

/**
 * Commit the result of a domain event that may have advanced the installment
 * counter: writes the month record, and `bills.paid_count` when it changed.
 */
export async function commitBillRecord(
  month: MonthKey,
  before: Bill,
  after: { bill: Bill; record: MonthRecord },
): Promise<void> {
  await writeMonthRecord(after.bill.id, month, after.record);
  if ((after.bill.paidCount ?? 0) !== (before.paidCount ?? 0)) {
    const { error } = await supabase
      .from('bills')
      .update({ paid_count: after.bill.paidCount ?? 0 })
      .eq('id', after.bill.id);
    if (error) throw new Error(error.message);
  }
}
