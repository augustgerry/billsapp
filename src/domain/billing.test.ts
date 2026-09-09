import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Bill, Group, MonthRecord } from '../types/models';
import {
  applyConfirm,
  applyEarlyPayoff,
  applyEditNominal,
  applyProofUpload,
  applyReject,
  applySelfDeclare,
  billAmountForMonth,
  billBadge,
  buildReminderText,
  canConfirmPayment,
  canEditNominal,
  canSelfDeclare,
  currentInstallmentNumber,
  earlyPayoffInfo,
  expectedShare,
  isBillSettledForMonth,
  isInstallmentDone,
  maybeAdvanceInstallment,
  monthlyOverview,
  perInstallmentFromTotal,
  readMonthRecord,
  requiredMembers,
} from './billing';

const MONTH = '2026-09';

// --- fixtures --------------------------------------------------------------

function emptyRecord(): MonthRecord {
  return { amount: null, payments: {} };
}

function paidRecord(members: string[], amount: number): MonthRecord {
  const rec = emptyRecord();
  for (const m of members) {
    rec.payments[m] = {
      status: 'paid',
      amount,
      proofImage: 'x',
      uploadedAt: 1,
      ocrMatched: true,
    };
  }
  return rec;
}

function singleBill(over: Partial<Bill> = {}): Bill {
  return {
    id: 'b1',
    name: 'Listrik',
    category: 'Listrik',
    type: 'single',
    responsible: 'Gerry',
    splitMembers: [],
    estimate: 300000,
    dueDay: 20,
    dueMonth: 9,
    dueYear: 2026,
    ...over,
  };
}

function splitBill(over: Partial<Bill> = {}): Bill {
  return {
    id: 'b2',
    name: 'WiFi',
    category: 'WiFi',
    type: 'split',
    responsible: 'Gerry',
    splitMembers: ['Gerry', 'Kaka', 'Nina'],
    estimate: 300000,
    dueDay: 20,
    dueMonth: 9,
    dueYear: 2026,
    ...over,
  };
}

function cicilanSingle(over: Partial<Bill> = {}): Bill {
  return singleBill({
    id: 'c1',
    name: 'Cicilan Motor',
    category: 'Cicilan',
    tenor: 12,
    paidCount: 0,
    ...over,
  });
}

function cicilanSplit(over: Partial<Bill> = {}): Bill {
  return splitBill({
    id: 'c2',
    name: 'Cicilan Kulkas',
    category: 'Cicilan',
    tenor: 6,
    paidCount: 0,
    ...over,
  });
}

function group(bills: Bill[], monthly: Group['monthly'] = {}): Group {
  return {
    code: 'ABC12',
    name: 'Rumah Kita',
    pin: '123456',
    members: [
      { name: 'Gerry', email: 'gerry@x.com' },
      { name: 'Kaka', email: 'kaka@x.com' },
      { name: 'Nina', email: 'nina@x.com' },
    ],
    bills,
    monthly,
    createdAt: 0,
  };
}

// --- predicates -----------------------------------------------------------

test('isInstallmentDone', () => {
  assert.equal(isInstallmentDone(singleBill()), false);
  assert.equal(isInstallmentDone(cicilanSingle({ paidCount: 11 })), false);
  assert.equal(isInstallmentDone(cicilanSingle({ paidCount: 12 })), true);
  assert.equal(isInstallmentDone(cicilanSingle({ paidCount: 13 })), true);
});

test('requiredMembers: single is just the PJ', () => {
  assert.deepEqual(requiredMembers(singleBill()), ['Gerry']);
});

test('requiredMembers: split excludes the responsible/menalangi member', () => {
  assert.deepEqual(requiredMembers(splitBill()), ['Kaka', 'Nina']);
});

test('requiredMembers: none once the installment is done', () => {
  assert.deepEqual(requiredMembers(cicilanSingle({ paidCount: 12 })), []);
  assert.deepEqual(requiredMembers(cicilanSplit({ paidCount: 6 })), []);
});

test('expectedShare: split = total / N members (incl. responsible), single = full', () => {
  assert.equal(expectedShare(splitBill(), emptyRecord()), 100000);
  assert.equal(expectedShare(singleBill(), emptyRecord()), 300000);
});

test('expectedShare respects the per-month nominal override', () => {
  const rec: MonthRecord = { amount: 360000, payments: {} };
  assert.equal(expectedShare(splitBill(), rec), 120000);
  assert.equal(billAmountForMonth(splitBill(), rec), 360000);
});

test('perInstallmentFromTotal rounds', () => {
  assert.equal(perInstallmentFromTotal(1000000, 12), 83333);
  assert.equal(perInstallmentFromTotal(1200000, 6), 200000);
  assert.equal(perInstallmentFromTotal(1000000, 0), 0);
});

// --- applyProofUpload ----------------------------------------------------

test('applyProofUpload: single non-installment clean match -> paid + locks month nominal', () => {
  const bill = singleBill();
  const rec = emptyRecord();
  const out = applyProofUpload(bill, rec, {
    member: 'Gerry',
    ocrAmount: 300500, // within the Rp1.000 tolerance of estimate
    proofImage: 'data:...',
    now: 1000,
  });
  assert.equal(out.matched, true);
  assert.equal(out.record.payments.Gerry.status, 'paid');
  assert.equal(out.record.payments.Gerry.ocrMatched, true);
  assert.equal(out.record.amount, 300500); // nominal locked to the reading
  assert.equal(out.advanced, false);
  // inputs untouched
  assert.equal(rec.amount, null);
  assert.equal(rec.payments.Gerry, undefined);
});

test('applyProofUpload: mismatch -> review, month nominal untouched', () => {
  const out = applyProofUpload(singleBill(), emptyRecord(), {
    member: 'Gerry',
    ocrAmount: 100000,
    proofImage: 'x',
    now: 1,
  });
  assert.equal(out.matched, false);
  assert.equal(out.record.payments.Gerry.status, 'review');
  assert.equal(out.record.payments.Gerry.ocrMatched, false);
  assert.equal(out.record.amount, null);
});

test('applyProofUpload: split match does NOT lock the month nominal', () => {
  const out = applyProofUpload(splitBill(), emptyRecord(), {
    member: 'Kaka',
    ocrAmount: 100000,
    proofImage: 'x',
    now: 1,
  });
  assert.equal(out.matched, true);
  assert.equal(out.record.payments.Kaka.status, 'paid');
  assert.equal(out.record.amount, null);
  assert.equal(isBillSettledForMonth(out.bill, out.record), false); // Nina still owes
});

test('applyProofUpload: cicilan single match advances paidCount once', () => {
  const bill = cicilanSingle({ paidCount: 3 });
  const out = applyProofUpload(bill, emptyRecord(), {
    member: 'Gerry',
    ocrAmount: 300000,
    proofImage: 'x',
    now: 1,
  });
  assert.equal(out.advanced, true);
  assert.equal(out.bill.paidCount, 4);
  assert.equal(out.record.installmentAdvanced, true);
  assert.equal(bill.paidCount, 3); // input untouched
});

test('applyProofUpload: re-upload in the same month does not double-advance', () => {
  const bill = cicilanSingle({ paidCount: 3 });
  const first = applyProofUpload(bill, emptyRecord(), {
    member: 'Gerry',
    ocrAmount: 300000,
    proofImage: 'x',
    now: 1,
  });
  assert.equal(first.bill.paidCount, 4);

  const second = applyProofUpload(first.bill, first.record, {
    member: 'Gerry',
    ocrAmount: 300000,
    proofImage: 'y',
    now: 2,
  });
  assert.equal(second.advanced, false);
  assert.equal(second.bill.paidCount, 4); // still 4, not 5
});

test('applyProofUpload: cicilan split advances only when the last required member pays', () => {
  const bill = cicilanSplit({ paidCount: 1 });
  const afterKaka = applyProofUpload(bill, emptyRecord(), {
    member: 'Kaka',
    ocrAmount: 100000,
    proofImage: 'x',
    now: 1,
  });
  assert.equal(afterKaka.advanced, false);
  assert.equal(afterKaka.bill.paidCount, 1);

  const afterNina = applyProofUpload(afterKaka.bill, afterKaka.record, {
    member: 'Nina',
    ocrAmount: 100000,
    proofImage: 'x',
    now: 2,
  });
  assert.equal(afterNina.advanced, true);
  assert.equal(afterNina.bill.paidCount, 2);

  // a stray re-upload by Kaka must not advance again
  const stray = applyProofUpload(afterNina.bill, afterNina.record, {
    member: 'Kaka',
    ocrAmount: 100000,
    proofImage: 'z',
    now: 3,
  });
  assert.equal(stray.advanced, false);
  assert.equal(stray.bill.paidCount, 2);
});

// --- applySelfDeclare --------------------------------------------------

test('applySelfDeclare: split review -> awaiting, preserves proof + amount', () => {
  const rec: MonthRecord = {
    amount: null,
    payments: {
      Kaka: {
        status: 'review',
        amount: 95000,
        proofImage: 'p',
        uploadedAt: 7,
        ocrMatched: false,
      },
    },
  };
  const out = applySelfDeclare(splitBill(), rec, 'Kaka');
  assert.equal(out.record.payments.Kaka.status, 'awaiting');
  assert.equal(out.record.payments.Kaka.amount, 95000);
  assert.equal(out.record.payments.Kaka.proofImage, 'p');
  assert.equal(out.advanced, false);
});

test('applySelfDeclare: single review -> paid (self-attest), advances cicilan', () => {
  const bill = cicilanSingle({ paidCount: 5 });
  const rec: MonthRecord = {
    amount: null,
    payments: {
      Gerry: {
        status: 'review',
        amount: 111,
        proofImage: 'p',
        uploadedAt: 7,
        ocrMatched: false,
      },
    },
  };
  const out = applySelfDeclare(bill, rec, 'Gerry');
  assert.equal(out.record.payments.Gerry.status, 'paid');
  assert.equal(out.advanced, true);
  assert.equal(out.bill.paidCount, 6);
});

// --- applyConfirm / applyReject --------------------------------------

test('applyConfirm: awaiting -> paid and advances split cicilan when all now paid', () => {
  const bill = cicilanSplit({ paidCount: 0 });
  const rec: MonthRecord = {
    amount: null,
    payments: {
      Kaka: { status: 'paid', amount: 50000, proofImage: 'x', uploadedAt: 1 },
      Nina: { status: 'awaiting', amount: 50000, proofImage: 'y', uploadedAt: 2 },
    },
  };
  const out = applyConfirm(bill, rec, 'Nina');
  assert.equal(out.record.payments.Nina.status, 'paid');
  assert.equal(out.advanced, true);
  assert.equal(out.bill.paidCount, 1);
});

test('applyReject: awaiting -> unpaid and drops the proof', () => {
  const rec: MonthRecord = {
    amount: null,
    payments: {
      Nina: { status: 'awaiting', amount: 50000, proofImage: 'y', uploadedAt: 2 },
    },
  };
  const out = applyReject(rec, 'Nina');
  assert.deepEqual(out.payments.Nina, {
    status: 'unpaid',
    amount: null,
    proofImage: null,
    uploadedAt: null,
  });
  // input untouched
  assert.equal(rec.payments.Nina.status, 'awaiting');
});

// --- early payoff ----------------------------------------------------

test('earlyPayoffInfo: single installment with >1 left', () => {
  assert.deepEqual(
    earlyPayoffInfo(cicilanSingle({ paidCount: 4 }), emptyRecord()),
    { remaining: 8, remainingAmount: 2400000 },
  );
});

test('earlyPayoffInfo: null for split, for last installment, and when done', () => {
  assert.equal(earlyPayoffInfo(cicilanSplit(), emptyRecord()), null);
  assert.equal(
    earlyPayoffInfo(cicilanSingle({ tenor: 12, paidCount: 11 }), emptyRecord()),
    null,
  );
  assert.equal(
    earlyPayoffInfo(cicilanSingle({ tenor: 12, paidCount: 12 }), emptyRecord()),
    null,
  );
  assert.equal(earlyPayoffInfo(singleBill(), emptyRecord()), null);
});

test('applyEarlyPayoff: clean match jumps paidCount to tenor', () => {
  const bill = cicilanSingle({ tenor: 12, paidCount: 4 });
  const out = applyEarlyPayoff(bill, emptyRecord(), {
    ocrAmount: 2400000,
    proofImage: 'x',
    now: 9,
  });
  assert.equal(out.matched, true);
  assert.equal(out.bill.paidCount, 12);
  assert.equal(isInstallmentDone(out.bill), true);
  assert.equal(out.record.payments.Gerry.status, 'paid');
  assert.equal(out.record.installmentAdvanced, true);
});

test('applyEarlyPayoff: mismatch changes nothing', () => {
  const bill = cicilanSingle({ tenor: 12, paidCount: 4 });
  const out = applyEarlyPayoff(bill, emptyRecord(), {
    ocrAmount: 100000,
    proofImage: 'x',
    now: 9,
  });
  assert.equal(out.matched, false);
  assert.equal(out.bill.paidCount, 4);
  assert.deepEqual(out.record.payments, {});
});

// --- permissions ---------------------------------------------------

test('canEditNominal / canConfirmPayment: responsible only', () => {
  assert.equal(canEditNominal(splitBill(), 'Gerry'), true);
  assert.equal(canEditNominal(splitBill(), 'Kaka'), false);
  assert.equal(canConfirmPayment(splitBill(), 'Gerry'), true);
  assert.equal(canConfirmPayment(splitBill(), 'Nina'), false);
});

test('canSelfDeclare: split = the uploader, single = the PJ', () => {
  assert.equal(canSelfDeclare(splitBill(), 'Kaka', 'Kaka'), true);
  assert.equal(canSelfDeclare(splitBill(), 'Gerry', 'Kaka'), false);
  assert.equal(canSelfDeclare(singleBill(), 'Gerry', 'Gerry'), true);
  assert.equal(canSelfDeclare(singleBill(), 'Kaka', 'Gerry'), false);
});

// --- maybeAdvanceInstallment direct ------------------------------

test('maybeAdvanceInstallment: no-op for non-installment bills', () => {
  const bill = splitBill();
  assert.equal(maybeAdvanceInstallment(bill, paidRecord(['Kaka', 'Nina'], 1)), false);
});

test('maybeAdvanceInstallment: no-op once already done', () => {
  const bill = cicilanSplit({ paidCount: 6 });
  assert.equal(maybeAdvanceInstallment(bill, paidRecord(['Kaka', 'Nina'], 1)), false);
  assert.equal(bill.paidCount, 6);
});

// --- dashboard selectors ---------------------------------------

test('monthlyOverview: no bills -> everyone has no dues, nothing owed', () => {
  const ov = monthlyOverview(group([]), MONTH);
  assert.equal(ov.totalMonth, 0);
  for (const m of ov.members) {
    assert.equal(m.hasDues, false);
    assert.equal(m.owed, 0);
    assert.equal(m.contribution, 0);
  }
});

test('monthlyOverview: split spreads contribution across all members, owes only non-PJ', () => {
  const ov = monthlyOverview(group([splitBill()]), MONTH);
  assert.equal(ov.totalMonth, 300000);
  const by = Object.fromEntries(ov.members.map((m) => [m.name, m]));
  assert.equal(by.Gerry.contribution, 100000);
  assert.equal(by.Gerry.owed, 0); // PJ fronts, is never "owed"
  assert.equal(by.Gerry.hasDues, false);
  assert.equal(by.Kaka.contribution, 100000);
  assert.equal(by.Kaka.owed, 100000);
  assert.equal(by.Kaka.hasDues, true);
  assert.equal(by.Nina.owed, 100000);
});

test('monthlyOverview: a paid member drops out of owed but keeps the contribution', () => {
  const monthly = { [MONTH]: { b2: paidRecord(['Kaka'], 100000) } };
  const ov = monthlyOverview(group([splitBill()], monthly), MONTH);
  const by = Object.fromEntries(ov.members.map((m) => [m.name, m]));
  assert.equal(by.Kaka.owed, 0);
  assert.equal(by.Kaka.contribution, 100000);
  assert.equal(by.Nina.owed, 100000);
});

test('monthlyOverview: single bill owes the PJ, finished installments are excluded', () => {
  const bills = [singleBill(), cicilanSingle({ paidCount: 12 })];
  const ov = monthlyOverview(group(bills), MONTH);
  assert.equal(ov.totalMonth, 300000); // only the active single bill
  const gerry = ov.members.find((m) => m.name === 'Gerry')!;
  assert.equal(gerry.owed, 300000);
  assert.equal(gerry.hasDues, true);
});

test('buildReminderText lists the unpaid, else the all-clear line', () => {
  const now = new Date(2026, 8, 10);
  const withDues = buildReminderText(group([splitBill()]), MONTH, now);
  assert.match(withDues, /Kaka belum bayar bagian "WiFi" \(transfer ke Gerry\)/);
  assert.match(withDues, /Nina belum bayar bagian "WiFi"/);

  const monthly = { [MONTH]: { b2: paidRecord(['Kaka', 'Nina'], 100000) } };
  const clear = buildReminderText(group([splitBill()], monthly), MONTH, now);
  assert.match(clear, /sudah beres/);
});

test('billBadge: done > settled > overdue > due', () => {
  const now = new Date(2026, 8, 10, 12, 0, 0);
  assert.equal(billBadge(cicilanSingle({ paidCount: 12 }), emptyRecord(), now).kind, 'installment-done');
  assert.equal(
    billBadge(splitBill(), paidRecord(['Kaka', 'Nina'], 100000), now).kind,
    'paid',
  );
  assert.equal(billBadge(singleBill({ dueDay: 5 }), emptyRecord(), now).kind, 'overdue');
  assert.equal(billBadge(singleBill({ dueDay: 25 }), emptyRecord(), now).kind, 'due');
});

test('currentInstallmentNumber / applyEditNominal / readMonthRecord', () => {
  assert.equal(currentInstallmentNumber(cicilanSingle({ paidCount: 3 })), 4);
  assert.equal(applyEditNominal(singleBill(), 425000).estimate, 425000);

  const g = group([singleBill()]);
  const rec = readMonthRecord(g, MONTH, 'b1');
  assert.deepEqual(rec, { amount: null, payments: {} });
  assert.deepEqual(g.monthly, {}); // read must not create
});
