/**
 * Kongsi billing rules — the "installment + payment status" logic that
 * PROJECT_BRIEF flags as the most misunderstood part of the app.
 *
 * This is a faithful port of the logic in `kongsi-pilot.html` with two
 * deliberate changes, both documented at their call sites and in
 * docs/ARCHITECTURE.md:
 *   1. `maybeAdvanceInstallment` is guarded against double-counting a month
 *      (`MonthRecord.installmentAdvanced`).
 *   2. `MemberPayment.ocrMatched` is actually persisted, so the PJ has context
 *      when confirming an `awaiting` payment.
 *
 * Event functions (`applyProofUpload`, `applySelfDeclare`, `applyConfirm`,
 * `applyReject`, `applyEarlyPayoff`, `applyEditNominal`) are pure: they clone
 * their inputs and return the next state. The caller persists whatever changed.
 * Selectors are read-only and never mutate `group`.
 */

import type {
  Bill,
  BillId,
  Group,
  MemberName,
  MemberPayment,
  MemberSummary,
  MonthKey,
  MonthRecord,
  OwedLine,
  PaymentStatus,
} from '../types/models';
import { amountMatches } from './money';
import {
  MONTH_NAMES_SHORT,
  daysStatus,
  monthKeyLabel,
  monthLabel,
} from './dates';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function cloneBill(bill: Bill): Bill {
  return structuredClone(bill);
}

function cloneRecord(record: MonthRecord): MonthRecord {
  return structuredClone(record);
}

function emptyPayment(): MemberPayment {
  return { status: 'unpaid', amount: null, proofImage: null, uploadedAt: null };
}

/**
 * Read (never create) the month record for a bill. Unlike the prototype's
 * `getMonthRecord`, this does not mutate `group.monthly`; a missing record
 * reads as an empty one.
 */
export function readMonthRecord(
  group: Group,
  month: MonthKey,
  billId: BillId,
): MonthRecord {
  return group.monthly[month]?.[billId] ?? { amount: null, payments: {} };
}

// ---------------------------------------------------------------------------
// Core installment predicates
// ---------------------------------------------------------------------------

/** True once every installment is paid — the bill then needs no more payments. */
export function isInstallmentDone(bill: Bill): boolean {
  return !!bill.tenor && (bill.paidCount ?? 0) >= bill.tenor;
}

/** 1-based number of the installment currently being collected. */
export function currentInstallmentNumber(bill: Bill): number {
  return (bill.paidCount ?? 0) + 1;
}

/** Effective nominal for this bill this month (per-month override wins). */
export function billAmountForMonth(bill: Bill, record: MonthRecord): number {
  return record.amount ?? bill.estimate;
}

/** `Math.round(total / tenor)` — the "hitung dari total dibagi tenor" toggle. */
export function perInstallmentFromTotal(total: number, tenor: number): number {
  return tenor > 0 ? Math.round(total / tenor) : 0;
}

/**
 * Who must pay into this bill this month.
 * - installment finished  -> nobody
 * - `single`              -> just the responsible member
 * - `split`               -> every split member EXCEPT the responsible
 *   (the responsible fronts the money to the provider; the rest repay them)
 */
export function requiredMembers(bill: Bill): MemberName[] {
  if (isInstallmentDone(bill)) return [];
  if (bill.type === 'single') return [bill.responsible];
  return bill.splitMembers.filter((m) => m !== bill.responsible);
}

/** Status of one member's payment for a bill/month (defaults to `unpaid`). */
export function paymentStatus(
  record: MonthRecord,
  member: MemberName,
): PaymentStatus {
  return record.payments[member]?.status ?? 'unpaid';
}

/** Per-person expected transfer: split => total / N members, single => full. */
export function expectedShare(bill: Bill, record: MonthRecord): number {
  const amount = billAmountForMonth(bill, record);
  return bill.type === 'split' ? amount / bill.splitMembers.length : amount;
}

/** All required members have paid (or the installment is already done). */
export function isBillSettledForMonth(
  bill: Bill,
  record: MonthRecord,
): boolean {
  if (isInstallmentDone(bill)) return true;
  return requiredMembers(bill).every(
    (m) => paymentStatus(record, m) === 'paid',
  );
}

// ---------------------------------------------------------------------------
// Installment advancement (guarded port of `maybeAdvanceInstallment`)
// ---------------------------------------------------------------------------

/**
 * MUTATES `bill` and `record`. Bumps `bill.paidCount` by one iff every member
 * required this month has reached `paid`. `paidCount` advances per-month, never
 * per-person.
 *
 * Guards beyond the prototype:
 *  - no-op once `record.installmentAdvanced` is set (idempotent within a month)
 *  - no-op if the installment is already done or nobody is required
 *
 * Returns whether it advanced.
 */
export function maybeAdvanceInstallment(
  bill: Bill,
  record: MonthRecord,
): boolean {
  if (!bill.tenor) return false;
  if (isInstallmentDone(bill)) return false;
  if (record.installmentAdvanced) return false;

  const required = requiredMembers(bill);
  if (required.length === 0) return false;

  const allPaid = required.every(
    (m) => paymentStatus(record, m) === 'paid',
  );
  if (!allPaid) return false;

  bill.paidCount = (bill.paidCount ?? 0) + 1;
  record.installmentAdvanced = true;
  return true;
}

// ---------------------------------------------------------------------------
// Permission checks (UI gating; Supabase RLS enforces the real boundary)
// ---------------------------------------------------------------------------

/** Only the responsible member may edit a bill's nominal after creation. */
export function canEditNominal(bill: Bill, user: MemberName): boolean {
  return user === bill.responsible;
}

/** Only the responsible/PJ may confirm or reject an `awaiting` payment. */
export function canConfirmPayment(bill: Bill, user: MemberName): boolean {
  return user === bill.responsible;
}

/**
 * Who may push a `review` payment forward:
 *  - split : only the member who uploaded (they self-declare -> `awaiting`)
 *  - single: only the PJ (who is also the uploader) -> straight to `paid`
 */
export function canSelfDeclare(
  bill: Bill,
  user: MemberName,
  member: MemberName,
): boolean {
  return bill.type === 'split' ? user === member : user === bill.responsible;
}

// ---------------------------------------------------------------------------
// Events (pure: clone in, next-state out)
// ---------------------------------------------------------------------------

export interface ProofUploadInput {
  member: MemberName;
  /** Nominal read by OCR from the transfer proof; null when unreadable. */
  ocrAmount: number | null;
  /** Data URI / storage URL of the proof image. */
  proofImage: string;
  /** Epoch ms. */
  now: number;
}

export interface BillRecordResult {
  bill: Bill;
  record: MonthRecord;
  /** Whether `bill.paidCount` advanced as a side effect. */
  advanced: boolean;
}

/**
 * A required member uploads a transfer proof.
 *  - OCR within tolerance of the expected share -> `paid` (clean match, trusted)
 *      · non-installment `single` also locks the month's nominal to the reading
 *      · may advance the installment counter
 *  - otherwise -> `review` (uploader can then self-declare)
 */
export function applyProofUpload(
  bill: Bill,
  record: MonthRecord,
  input: ProofUploadInput,
): BillRecordResult & { matched: boolean } {
  const nextBill = cloneBill(bill);
  const nextRecord = cloneRecord(record);
  const matched = amountMatches(
    input.ocrAmount,
    expectedShare(nextBill, nextRecord),
  );

  nextRecord.payments[input.member] = {
    status: matched ? 'paid' : 'review',
    amount: input.ocrAmount,
    proofImage: input.proofImage,
    uploadedAt: input.now,
    ocrMatched: matched,
  };

  let advanced = false;
  if (matched) {
    if (nextBill.type === 'single' && !nextBill.tenor) {
      nextRecord.amount = input.ocrAmount;
    }
    advanced = maybeAdvanceInstallment(nextBill, nextRecord);
  }

  return { bill: nextBill, record: nextRecord, matched, advanced };
}

/**
 * Uploader acts on their own `review` payment ("Tandai valid" / "Tandai sudah
 * bayar"):
 *  - split  -> `awaiting` (needs PJ confirmation)
 *  - single -> `paid` (uploader is the PJ, self-attests)
 * Existing amount / proof / timestamp are preserved.
 */
export function applySelfDeclare(
  bill: Bill,
  record: MonthRecord,
  member: MemberName,
): BillRecordResult {
  const nextBill = cloneBill(bill);
  const nextRecord = cloneRecord(record);
  const prev = nextRecord.payments[member] ?? emptyPayment();

  let advanced = false;
  if (nextBill.type === 'split') {
    nextRecord.payments[member] = { ...prev, status: 'awaiting' };
  } else {
    nextRecord.payments[member] = { ...prev, status: 'paid' };
    advanced = maybeAdvanceInstallment(nextBill, nextRecord);
  }

  return { bill: nextBill, record: nextRecord, advanced };
}

/** PJ confirms an `awaiting` payment -> `paid` (may advance the installment). */
export function applyConfirm(
  bill: Bill,
  record: MonthRecord,
  member: MemberName,
): BillRecordResult {
  const nextBill = cloneBill(bill);
  const nextRecord = cloneRecord(record);
  const prev = nextRecord.payments[member] ?? emptyPayment();

  nextRecord.payments[member] = { ...prev, status: 'paid' };
  const advanced = maybeAdvanceInstallment(nextBill, nextRecord);

  return { bill: nextBill, record: nextRecord, advanced };
}

/**
 * PJ rejects an `awaiting` payment -> `unpaid`. The proof is dropped (matches
 * the prototype, which replaced the whole payment object). Never decrements
 * `paidCount` — see open question #1 in docs/ARCHITECTURE.md.
 */
export function applyReject(
  record: MonthRecord,
  member: MemberName,
): MonthRecord {
  const nextRecord = cloneRecord(record);
  nextRecord.payments[member] = emptyPayment();
  return nextRecord;
}

export interface EarlyPayoffInfo {
  /** Installments still outstanding (always > 1 when payoff is offered). */
  remaining: number;
  /** `remaining * amountForMonth` — the lump sum to transfer. */
  remainingAmount: number;
}

/**
 * "Lunasi sisa Nx sekaligus". Offered only for `type === 'single'` installments
 * with more than one payment left (split is out of MVP scope, per the brief).
 * Returns null when payoff is not applicable.
 */
export function earlyPayoffInfo(
  bill: Bill,
  record: MonthRecord,
): EarlyPayoffInfo | null {
  if (bill.type !== 'single' || !bill.tenor) return null;
  if (isInstallmentDone(bill)) return null;
  const remaining = bill.tenor - (bill.paidCount ?? 0);
  if (remaining <= 1) return null;
  return {
    remaining,
    remainingAmount: remaining * billAmountForMonth(bill, record),
  };
}

export interface EarlyPayoffInput {
  ocrAmount: number | null;
  proofImage: string;
  now: number;
}

/**
 * Apply an early-payoff proof for a single-type installment. On a clean match,
 * jumps `paidCount` straight to `tenor` and marks the responsible member paid
 * for the current month. On mismatch, nothing changes (`matched: false`).
 */
export function applyEarlyPayoff(
  bill: Bill,
  record: MonthRecord,
  input: EarlyPayoffInput,
): BillRecordResult & { matched: boolean } {
  const info = earlyPayoffInfo(bill, record);
  const matched =
    info != null && amountMatches(input.ocrAmount, info.remainingAmount);

  const nextBill = cloneBill(bill);
  const nextRecord = cloneRecord(record);

  if (matched) {
    nextBill.paidCount = nextBill.tenor;
    nextRecord.payments[nextBill.responsible] = {
      status: 'paid',
      amount: input.ocrAmount,
      proofImage: input.proofImage,
      uploadedAt: input.now,
      ocrMatched: true,
    };
    nextRecord.installmentAdvanced = true;
  }

  return { bill: nextBill, record: nextRecord, matched, advanced: matched };
}

/** Responsible member edits the recurring nominal. Returns the updated bill. */
export function applyEditNominal(bill: Bill, newAmount: number): Bill {
  const nextBill = cloneBill(bill);
  nextBill.estimate = newAmount;
  return nextBill;
}

// ---------------------------------------------------------------------------
// Dashboard selectors
// ---------------------------------------------------------------------------

export type BillBadgeKind = 'installment-done' | 'paid' | 'overdue' | 'due';

export interface BillBadge {
  kind: BillBadgeKind;
  text: string;
}

export function billBadge(
  bill: Bill,
  record: MonthRecord,
  now: Date = new Date(),
): BillBadge {
  if (isInstallmentDone(bill)) {
    return { kind: 'installment-done', text: 'Cicilan lunas' };
  }
  if (isBillSettledForMonth(bill, record)) {
    return { kind: 'paid', text: 'Lunas' };
  }
  const due = daysStatus(bill.dueDay, now);
  return due.overdue
    ? { kind: 'overdue', text: due.text }
    : { kind: 'due', text: due.text };
}

/** The grey sub-line under a bill name on the dashboard. Ported verbatim. */
export function billMetaText(bill: Bill): string {
  let meta = `Jatuh tempo tgl ${bill.dueDay}`;
  if (bill.dueMonth && bill.dueYear) {
    meta += ` (mulai ${MONTH_NAMES_SHORT[bill.dueMonth - 1]} ${bill.dueYear})`;
  }
  if (bill.tenor) {
    meta += isInstallmentDone(bill)
      ? ` · Cicilan lunas (${bill.tenor}/${bill.tenor})`
      : ` · Cicilan ke-${currentInstallmentNumber(bill)} dari ${bill.tenor}`;
    meta +=
      bill.type === 'single'
        ? ` · PJ: ${bill.responsible}`
        : ` · Dibagi rata, transfer ke ${bill.responsible}`;
  } else {
    meta += bill.type === 'single' ? ` · PJ: ${bill.responsible}` : ' · Dibagi rata';
  }
  if (bill.lender) meta += ` · Pinjaman dari ${bill.lender}`;
  return meta;
}

export interface MonthlyOverview {
  month: MonthKey;
  /** Sum of every active bill's nominal this month. */
  totalMonth: number;
  /** name -> total this member is expected to contribute this month. */
  contributions: Record<MemberName, number>;
  members: MemberSummary[];
}

/**
 * Port of `renderGroup`'s aggregation loop. Skips finished installments
 * entirely (they drop out of totals, contributions, dues and reminders).
 */
export function monthlyOverview(
  group: Group,
  month: MonthKey,
): MonthlyOverview {
  const contributions: Record<MemberName, number> = {};
  const owed: Record<MemberName, number> = {};
  const owedDetail: Record<MemberName, OwedLine[]> = {};
  const hasDues: Record<MemberName, boolean> = {};

  for (const m of group.members) {
    contributions[m.name] = 0;
    owed[m.name] = 0;
    owedDetail[m.name] = [];
    hasDues[m.name] = false;
  }

  let totalMonth = 0;

  for (const bill of group.bills) {
    if (isInstallmentDone(bill)) continue;
    const record = readMonthRecord(group, month, bill.id);
    const amount = billAmountForMonth(bill, record);
    totalMonth += amount;
    const required = requiredMembers(bill);

    if (bill.type === 'split') {
      const share = amount / bill.splitMembers.length;
      for (const m of bill.splitMembers) {
        contributions[m] = (contributions[m] ?? 0) + share;
      }
      for (const m of required) {
        hasDues[m] = true;
        if (paymentStatus(record, m) !== 'paid') {
          owed[m] = (owed[m] ?? 0) + share;
          owedDetail[m].push({ billName: bill.name, amount: share });
        }
      }
    } else {
      contributions[bill.responsible] =
        (contributions[bill.responsible] ?? 0) + amount;
      for (const m of required) {
        hasDues[m] = true;
        if (paymentStatus(record, m) !== 'paid') {
          owed[m] = (owed[m] ?? 0) + amount;
          owedDetail[m].push({ billName: bill.name, amount });
        }
      }
    }
  }

  const members: MemberSummary[] = group.members.map((m) => ({
    name: m.name,
    contribution: contributions[m.name] ?? 0,
    owed: owed[m.name] ?? 0,
    owedDetail: owedDetail[m.name] ?? [],
    hasDues: hasDues[m.name] ?? false,
  }));

  return { month, totalMonth, contributions, members };
}

/**
 * Copy-paste reminder text for everyone still unpaid this month. Empty state
 * returns the "semua beres" line.
 */
export function buildReminderText(
  group: Group,
  month: MonthKey,
  now: Date = new Date(),
): string {
  const lines: string[] = [];
  for (const bill of group.bills) {
    if (isInstallmentDone(bill)) continue;
    const record = readMonthRecord(group, month, bill.id);
    for (const m of requiredMembers(bill)) {
      if (paymentStatus(record, m) !== 'paid') {
        const to =
          bill.type === 'split' ? ` (transfer ke ${bill.responsible})` : '';
        lines.push(`- ${m} belum bayar bagian "${bill.name}"${to}`);
      }
    }
  }
  return lines.length
    ? `Pengingat tagihan ${group.name} bulan ${monthLabel(now)}:\n${lines.join('\n')}`
    : `Semua tagihan bulan ${monthLabel(now)} sudah beres. Mantap!`;
}

// ---------------------------------------------------------------------------
// Trend chart + export (Ringkasan tab)
// ---------------------------------------------------------------------------

export interface MonthlyCategoryTotals {
  key: MonthKey;
  label: string;
  total: number;
  byCategory: Record<string, number>;
}

export function computeMonthlyCategoryTotals(
  group: Group,
): MonthlyCategoryTotals[] {
  return Object.keys(group.monthly)
    .sort()
    .map((key) => {
      const byCategory: Record<string, number> = {};
      for (const billId of Object.keys(group.monthly[key])) {
        const bill = group.bills.find((b) => b.id === billId);
        if (!bill) continue;
        const record = group.monthly[key][billId];
        const amount = record.amount ?? bill.estimate;
        byCategory[bill.category] = (byCategory[bill.category] ?? 0) + amount;
      }
      const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
      return { key, label: monthKeyLabel(key), total, byCategory };
    });
}

export interface ExportRow {
  bulan: string;
  tagihan: string;
  kategori: string;
  nominal: number;
  tipe: string;
}

export function buildExportRows(group: Group): ExportRow[] {
  const rows: ExportRow[] = [];
  for (const monthKey of Object.keys(group.monthly).sort()) {
    for (const billId of Object.keys(group.monthly[monthKey])) {
      const bill = group.bills.find((b) => b.id === billId);
      if (!bill) continue;
      const record = group.monthly[monthKey][billId];
      rows.push({
        bulan: monthKeyLabel(monthKey),
        tagihan: bill.name,
        kategori: bill.category,
        nominal: record.amount ?? bill.estimate,
        tipe:
          (bill.type === 'single' ? 'Satu orang' : 'Dibagi rata') +
          (bill.tenor ? ' (Cicilan)' : ''),
      });
    }
  }
  return rows;
}
