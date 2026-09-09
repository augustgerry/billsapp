/** Bill CRUD. Business rules live in `src/domain/billing.ts`. */

import type { Bill } from '@/types/models';
import { supabase } from './supabase';
import { billFromRow, billToRow } from './mappers';
import type { BillRow } from './database.types';

/** Insert a new recurring bill. `input` is a Bill without an id. */
export async function insertBill(
  groupId: string,
  input: Omit<Bill, 'id'>,
): Promise<Bill> {
  const { data, error } = await supabase
    .from('bills')
    .insert(billToRow(input, groupId))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return billFromRow(data as BillRow);
}

/** "Edit nominal" — only the responsible member (guard in UI; RLS is broad). */
export async function updateBillEstimate(
  billId: string,
  estimate: number,
): Promise<void> {
  const { error } = await supabase
    .from('bills')
    .update({ estimate })
    .eq('id', billId);
  if (error) throw new Error(error.message);
}

export async function updateBillPaidCount(
  billId: string,
  paidCount: number,
): Promise<void> {
  const { error } = await supabase
    .from('bills')
    .update({ paid_count: paidCount })
    .eq('id', billId);
  if (error) throw new Error(error.message);
}

export async function deleteBill(billId: string): Promise<void> {
  const { error } = await supabase.from('bills').delete().eq('id', billId);
  if (error) throw new Error(error.message);
}
