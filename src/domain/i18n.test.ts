import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysStatus, monthLabel } from './dates';
import { billMetaText } from './billing';
import type { Bill } from '../types/models';

const NOON_SEP_10 = new Date(2026, 8, 10, 12, 0, 0);

test('dates: en vs id', () => {
  assert.equal(monthLabel(NOON_SEP_10, 'en'), 'September 2026');
  assert.equal(monthLabel(NOON_SEP_10, 'id'), 'September 2026');
  assert.equal(daysStatus(5, NOON_SEP_10, 'en').text, '5 days late');
  assert.equal(daysStatus(5, NOON_SEP_10, 'id').text, 'Telat 5 hari');
  assert.equal(daysStatus(10, NOON_SEP_10, 'en').text, 'Due today');
  assert.equal(daysStatus(15, NOON_SEP_10, 'en').text, 'in 5 days');
  assert.equal(daysStatus(15, NOON_SEP_10, 'id').text, 'H-5');
});

test('billMetaText: en', () => {
  const bill: Bill = {
    id: 'b',
    name: 'Motor',
    category: 'Cicilan',
    type: 'single',
    responsible: 'Gerry',
    splitMembers: [],
    estimate: 100,
    dueDay: 5,
    dueMonth: 9,
    dueYear: 2026,
    tenor: 12,
    paidCount: 3,
  };
  const en = billMetaText(bill, 'en');
  assert.match(en, /Due on the 5/);
  assert.match(en, /Installment 4 of 12/);
  assert.match(en, /Responsible: Gerry/);
});
