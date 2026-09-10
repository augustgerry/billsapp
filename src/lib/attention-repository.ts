/**
 * Home "Lanjutkan" attention badges: per group, how many payments this month
 * the current user (as a bill's responsible member) still needs to act on.
 */

import { responsibleActionCount } from '@/domain/billing';
import { monthKey } from '@/domain/dates';
import { supabase } from './supabase';
import { assembleMonth, billFromRow } from './mappers';
import type { BillRow, PaymentRow } from './db';

export async function countGroupAttention(
  groupIds: string[],
  email: string,
): Promise<Record<string, number>> {
  if (groupIds.length === 0) return {};
  const month = monthKey();
  const lowerEmail = email.trim().toLowerCase();

  const [billsRes, membersRes] = await Promise.all([
    supabase
      .from('bills')
      .select('*')
      .in('group_id', groupIds),
    supabase
      .from('group_members')
      .select('group_id, name')
      .in('group_id', groupIds)
      .eq('status', 'active')
      .eq('email', lowerEmail),
  ]);
  if (billsRes.error) throw new Error(billsRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);

  const billRows = (billsRes.data ?? []) as BillRow[];
  if (billRows.length === 0) return {};

  const myNameByGroup = new Map<string, string>();
  for (const m of membersRes.data ?? []) myNameByGroup.set(m.group_id, m.name);

  const paysRes = await supabase
    .from('payments')
    .select('*')
    .in(
      'bill_id',
      billRows.map((b) => b.id),
    )
    .eq('month', month);
  if (paysRes.error) throw new Error(paysRes.error.message);

  const recordsByBill = assembleMonth([], (paysRes.data ?? []) as PaymentRow[]);

  const counts: Record<string, number> = {};
  for (const row of billRows) {
    const myName = myNameByGroup.get(row.group_id);
    if (!myName) continue;
    const bill = billFromRow(row);
    const record = recordsByBill[row.id] ?? { amount: null, payments: {} };
    const n = responsibleActionCount(bill, record, myName);
    if (n > 0) counts[row.group_id] = (counts[row.group_id] ?? 0) + n;
  }
  return counts;
}
