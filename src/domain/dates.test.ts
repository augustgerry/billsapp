import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthKey,
  monthLabel,
  monthKeyLabel,
  daysStatus,
  formatDateTime,
} from './dates';

const NOON_SEP_10 = new Date(2026, 8, 10, 12, 0, 0); // Sep 10 2026, local

test('monthKey / monthLabel', () => {
  assert.equal(monthKey(NOON_SEP_10), '2026-09');
  assert.equal(monthKey(new Date(2026, 0, 1)), '2026-01');
  assert.equal(monthLabel(NOON_SEP_10), 'September 2026');
});

test('monthKeyLabel', () => {
  assert.equal(monthKeyLabel('2026-09'), 'Sep 26');
  assert.equal(monthKeyLabel('2025-12'), 'Des 25');
});

test('daysStatus: future / today / overdue relative to now', () => {
  assert.deepEqual(daysStatus(15, NOON_SEP_10), { text: 'H-5', overdue: false });
  assert.deepEqual(daysStatus(10, NOON_SEP_10), {
    text: 'Jatuh tempo hari ini',
    overdue: false,
  });
  assert.deepEqual(daysStatus(5, NOON_SEP_10), {
    text: 'Telat 5 hari',
    overdue: true,
  });
});

test('formatDateTime', () => {
  const ts = new Date(2026, 8, 9, 14, 5, 0).getTime();
  assert.equal(formatDateTime(ts), '9 Sep 2026, 14:05');
});
