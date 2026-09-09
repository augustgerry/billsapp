import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BillMonthRow, BillRow, PaymentRow } from './database.types';
import {
  assembleMonth,
  billFromRow,
  billMonthToRow,
  billToRow,
  paymentFromRow,
  paymentToRow,
} from './mappers';

function billRow(over: Partial<BillRow> = {}): BillRow {
  return {
    id: 'b1',
    group_id: 'g1',
    name: 'Listrik',
    category: 'Listrik',
    type: 'single',
    responsible: 'Gerry',
    split_members: [],
    estimate: 300000,
    due_day: 20,
    due_month: 9,
    due_year: 2026,
    tenor: null,
    paid_count: 0,
    installment_total: null,
    lender: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...over,
  };
}

test('billFromRow: plain bill has no installment fields', () => {
  const bill = billFromRow(billRow());
  assert.equal(bill.tenor, undefined);
  assert.equal(bill.paidCount, undefined);
  assert.equal(bill.lender, undefined);
  assert.equal(bill.estimate, 300000);
  assert.deepEqual(bill.splitMembers, []);
});

test('billFromRow: cicilan carries tenor/paidCount/total/lender', () => {
  const bill = billFromRow(
    billRow({
      category: 'Cicilan',
      tenor: 12,
      paid_count: 3,
      installment_total: 3600000,
      lender: 'Kaka',
    }),
  );
  assert.equal(bill.tenor, 12);
  assert.equal(bill.paidCount, 3);
  assert.equal(bill.installmentTotal, 3600000);
  assert.equal(bill.lender, 'Kaka');
});

test('billToRow round-trips through billFromRow', () => {
  const original = billFromRow(
    billRow({ type: 'split', split_members: ['Gerry', 'Kaka'], category: 'WiFi' }),
  );
  const back = billFromRow(billRow({ ...billToRow(original, 'g1'), id: 'b1' } as BillRow));
  assert.deepEqual(back, original);
});

test('billToRow omits id when absent (DB generates it)', () => {
  const row = billToRow(
    { ...billFromRow(billRow()), id: undefined } as never,
    'g1',
  );
  assert.equal('id' in row, false);
  assert.equal(row.group_id, 'g1');
});

test('paymentFromRow maps snake_case + parses timestamp', () => {
  const row: PaymentRow = {
    bill_id: 'b1',
    month: '2026-09',
    member: 'Kaka',
    status: 'review',
    amount: 95000,
    proof_path: 'g1/b1/2026-09/Kaka.jpg',
    ocr_matched: false,
    is_receipt: true,
    platform: 'GoPay',
    suspicious_note: null,
    uploaded_at: '2026-09-05T10:00:00.000Z',
    updated_at: '2026-09-05T10:00:00.000Z',
  };
  const p = paymentFromRow(row);
  assert.equal(p.status, 'review');
  assert.equal(p.amount, 95000);
  assert.equal(p.proofImage, 'g1/b1/2026-09/Kaka.jpg');
  assert.equal(p.ocrMatched, false);
  assert.equal(p.isReceipt, true);
  assert.equal(p.platform, 'GoPay');
  assert.equal(p.uploadedAt, Date.parse('2026-09-05T10:00:00.000Z'));
});

test('paymentToRow: null timestamp, null ocr flag stay null', () => {
  const row = paymentToRow('b1', '2026-09', 'Kaka', {
    status: 'unpaid',
    amount: null,
    proofImage: null,
    uploadedAt: null,
  });
  assert.equal(row.uploaded_at, null);
  assert.equal(row.ocr_matched, null);
  assert.equal(row.proof_path, null);
  assert.equal(row.is_receipt, null);
});

test('assembleMonth folds bill_months + payments by bill id', () => {
  const bm: BillMonthRow[] = [
    {
      bill_id: 'b1',
      month: '2026-09',
      amount: 360000,
      installment_advanced: true,
      updated_at: 'x',
    },
  ];
  const pay: PaymentRow[] = [
    {
      bill_id: 'b1',
      month: '2026-09',
      member: 'Kaka',
      status: 'paid',
      amount: 120000,
      proof_path: null,
      ocr_matched: true,
      is_receipt: null,
      platform: null,
      suspicious_note: null,
      uploaded_at: null,
      updated_at: 'x',
    },
    {
      bill_id: 'b2',
      month: '2026-09',
      member: 'Nina',
      status: 'awaiting',
      amount: null,
      proof_path: null,
      ocr_matched: null,
      is_receipt: null,
      platform: null,
      suspicious_note: null,
      uploaded_at: null,
      updated_at: 'x',
    },
  ];
  const out = assembleMonth(bm, pay);
  assert.equal(out.b1.amount, 360000);
  assert.equal(out.b1.installmentAdvanced, true);
  assert.equal(out.b1.payments.Kaka.status, 'paid');
  assert.equal(out.b2.amount, null); // payment-only bill still gets a record
  assert.equal(out.b2.payments.Nina.status, 'awaiting');
});

test('billMonthToRow defaults installment_advanced to false', () => {
  assert.deepEqual(billMonthToRow('b1', '2026-09', { amount: null, payments: {} }), {
    bill_id: 'b1',
    month: '2026-09',
    amount: null,
    installment_advanced: false,
  });
});
