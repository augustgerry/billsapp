/**
 * Row <-> domain mapping. DB columns are snake_case; the domain layer
 * (`src/domain`, `src/types`) is camelCase. Nothing else in the app should
 * touch raw rows.
 *
 * Note: `MemberPayment.proofImage` holds the storage object *path*
 * (`bill_months`… no — `payments.proof_path`), not image bytes. Screens turn it
 * into a viewable URL via `src/lib/proofs.ts`.
 */

import type {
  Bill,
  BillCategory,
  BillId,
  BillType,
  Group,
  Member,
  MemberName,
  MemberPayment,
  MonthKey,
  MonthRecord,
  PaymentStatus,
} from '@/types/models';
import type {
  BillMonthRow,
  BillRow,
  GroupMemberRow,
  GroupRow,
  PaymentRow,
  TablesInsert,
} from './database.types';

// --- rows -> domain -------------------------------------------------------

export function memberFromRow(row: GroupMemberRow): Member {
  return { name: row.name, email: row.email };
}

export function billFromRow(row: BillRow): Bill {
  const bill: Bill = {
    id: row.id,
    name: row.name,
    category: row.category as BillCategory,
    type: row.type as BillType,
    responsible: row.responsible,
    splitMembers: row.split_members ?? [],
    estimate: Number(row.estimate),
    dueDay: row.due_day,
    dueMonth: row.due_month,
    dueYear: row.due_year,
  };
  if (row.tenor != null) {
    bill.tenor = row.tenor;
    bill.paidCount = row.paid_count ?? 0;
    if (row.installment_total != null) {
      bill.installmentTotal = Number(row.installment_total);
    }
    if (row.lender) bill.lender = row.lender;
  }
  return bill;
}

export function paymentFromRow(row: PaymentRow): MemberPayment {
  return {
    status: row.status as PaymentStatus,
    amount: row.amount != null ? Number(row.amount) : null,
    proofImage: row.proof_path,
    uploadedAt: row.uploaded_at ? Date.parse(row.uploaded_at) : null,
    ocrMatched: row.ocr_matched ?? undefined,
    isReceipt: row.is_receipt,
    platform: row.platform,
    suspiciousNote: row.suspicious_note,
  };
}

/** Fold `bill_months` + `payments` rows for one month into `MonthRecord`s by bill. */
export function assembleMonth(
  billMonthRows: BillMonthRow[],
  paymentRows: PaymentRow[],
): Record<BillId, MonthRecord> {
  const out: Record<BillId, MonthRecord> = {};
  const ensure = (billId: BillId): MonthRecord => {
    out[billId] ??= { amount: null, payments: {} };
    return out[billId];
  };
  for (const bm of billMonthRows) {
    const rec = ensure(bm.bill_id);
    rec.amount = bm.amount != null ? Number(bm.amount) : null;
    rec.installmentAdvanced = bm.installment_advanced;
  }
  for (const p of paymentRows) {
    ensure(p.bill_id).payments[p.member] = paymentFromRow(p);
  }
  return out;
}

export function groupFromRows(
  group: GroupRow,
  members: GroupMemberRow[],
  bills: BillRow[],
): Group {
  return {
    id: group.id,
    code: group.code,
    name: group.name,
    pin: group.pin,
    members: members.map(memberFromRow),
    bills: bills.map(billFromRow),
    monthly: {},
    createdAt: Date.parse(group.created_at),
  };
}

// --- domain -> rows ------------------------------------------------------

/** Columns for inserting/updating a bill. Omit `id` to let the DB generate one. */
export function billToRow(
  bill: Omit<Bill, 'id'> & { id?: string },
  groupId: string,
): TablesInsert<'bills'> {
  return {
    ...(bill.id ? { id: bill.id } : {}),
    group_id: groupId,
    name: bill.name,
    category: bill.category,
    type: bill.type,
    responsible: bill.responsible,
    split_members: bill.splitMembers,
    estimate: bill.estimate,
    due_day: bill.dueDay,
    due_month: bill.dueMonth,
    due_year: bill.dueYear,
    tenor: bill.tenor ?? null,
    paid_count: bill.paidCount ?? 0,
    installment_total: bill.installmentTotal ?? null,
    lender: bill.lender ?? null,
  };
}

export function billMonthToRow(
  billId: BillId,
  month: MonthKey,
  record: MonthRecord,
): TablesInsert<'bill_months'> {
  return {
    bill_id: billId,
    month,
    amount: record.amount,
    installment_advanced: record.installmentAdvanced ?? false,
  };
}

export function paymentToRow(
  billId: BillId,
  month: MonthKey,
  member: MemberName,
  payment: MemberPayment,
): TablesInsert<'payments'> {
  return {
    bill_id: billId,
    month,
    member,
    status: payment.status,
    amount: payment.amount,
    proof_path: payment.proofImage,
    ocr_matched: payment.ocrMatched ?? null,
    is_receipt: payment.isReceipt ?? null,
    platform: payment.platform ?? null,
    suspicious_note: payment.suspiciousNote ?? null,
    uploaded_at: payment.uploadedAt
      ? new Date(payment.uploadedAt).toISOString()
      : null,
  };
}
