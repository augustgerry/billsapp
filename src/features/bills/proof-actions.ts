/**
 * "Use case" glue for the payment-status flow: run a domain event, persist it,
 * and (for uploads) push the image to Storage + call OCR. Screens call these
 * and then reload the group.
 */

import {
  applyConfirm,
  applyEarlyPayoff,
  applyProofUpload,
  applyReject,
  applyReupload,
  applySelfDeclare,
} from '@/domain/billing';
import { commitBillRecord, writeMonthRecord } from '@/lib/payments-repository';
import {
  deleteProof,
  proofObjectPath,
  readProof,
  uploadProof,
} from '@/lib/proofs';
import type {
  Bill,
  Group,
  MemberName,
  MonthKey,
  MonthRecord,
} from '@/types/models';

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

interface UploadArgs {
  group: Group;
  bill: Bill;
  record: MonthRecord;
  month: MonthKey;
  member: MemberName;
  base64: string;
}

export interface SubmitProofOutcome {
  /** Auto-settled to `paid`. */
  matched: boolean;
  /** OCR reading was within tolerance of the expected amount. */
  amountOk: boolean;
  /** OCR verdict on whether the image is a transfer receipt at all. */
  isReceipt: boolean | null;
  suspiciousNote: string | null;
  /** Nominal OCR read (null if unreadable / OCR down). */
  ocrAmount: number | null;
}

/** A required member submits a transfer proof. */
export async function submitProof({
  group,
  bill,
  record,
  month,
  member,
  base64,
}: UploadArgs): Promise<SubmitProofOutcome> {
  const path = proofObjectPath(group.id, bill.id, month, member);
  await uploadProof(path, base64ToBytes(base64), 'image/jpeg');

  const analysis = await readProof(base64, 'image/jpeg').catch(() => null);

  const result = applyProofUpload(bill, record, {
    member,
    ocrAmount: analysis?.amount ?? null,
    proofImage: path,
    now: Date.now(),
    isReceipt: analysis?.isReceipt ?? null,
    platform: analysis?.platform ?? null,
    suspiciousNote: analysis?.suspiciousNote ?? null,
  });
  await commitBillRecord(month, bill, result);
  return {
    matched: result.matched,
    amountOk: result.amountOk,
    isReceipt: result.isReceipt,
    suspiciousNote: analysis?.suspiciousNote ?? null,
    ocrAmount: analysis?.amount ?? null,
  };
}

/** Early payoff proof (single-type installments only). */
export async function submitEarlyPayoff({
  group,
  bill,
  record,
  month,
  base64,
}: Omit<UploadArgs, 'member'>): Promise<{ matched: boolean }> {
  const path = proofObjectPath(group.id, bill.id, month, `${bill.responsible}-payoff`);
  await uploadProof(path, base64ToBytes(base64), 'image/jpeg');

  let ocrAmount: number | null = null;
  try {
    ocrAmount = (await readProof(base64, 'image/jpeg')).amount;
  } catch {
    ocrAmount = null;
  }

  const result = applyEarlyPayoff(bill, record, {
    ocrAmount,
    proofImage: path,
    now: Date.now(),
  });
  if (result.matched) await commitBillRecord(month, bill, result);
  return { matched: result.matched };
}

/** Uploader retries their own `review` payment — old proof is deleted. */
export async function reuploadProof(
  group: Group,
  bill: Bill,
  record: MonthRecord,
  month: MonthKey,
  member: MemberName,
): Promise<void> {
  const prevPath = record.payments[member]?.proofImage;
  const next = applyReupload(record, member);
  await writeMonthRecord(bill.id, month, next);
  if (prevPath) await deleteProof(prevPath).catch(() => undefined);
}

/** Uploader confirms their own `review` payment ("Tandai valid / sudah bayar"). */
export async function selfDeclare(
  bill: Bill,
  record: MonthRecord,
  month: MonthKey,
  member: MemberName,
): Promise<void> {
  const result = applySelfDeclare(bill, record, member);
  await commitBillRecord(month, bill, result);
}

/** PJ confirms an `awaiting` payment. */
export async function confirmPayment(
  bill: Bill,
  record: MonthRecord,
  month: MonthKey,
  member: MemberName,
): Promise<void> {
  const result = applyConfirm(bill, record, member);
  await commitBillRecord(month, bill, result);
}

/** PJ rejects an `awaiting` payment — proof is deleted. */
export async function rejectPayment(
  bill: Bill,
  record: MonthRecord,
  month: MonthKey,
  member: MemberName,
): Promise<void> {
  const prevPath = record.payments[member]?.proofImage;
  const next = applyReject(record, member);
  await writeMonthRecord(bill.id, month, next);
  // paid_count is intentionally not rolled back — see open question #1.
  if (prevPath) await deleteProof(prevPath).catch(() => undefined);
}
