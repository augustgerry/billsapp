import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRupiah,
  formatRp,
  formatShort,
  amountMatches,
  MATCH_TOLERANCE,
} from './money';

test('parseRupiah strips non-digits', () => {
  assert.equal(parseRupiah('Rp.300.000'), 300000);
  assert.equal(parseRupiah('300000'), 300000);
  assert.equal(parseRupiah('Rp 1.234.567'), 1234567);
  assert.equal(parseRupiah(''), 0);
  assert.equal(parseRupiah(null), 0);
  assert.equal(parseRupiah(undefined), 0);
});

test('formatRp groups by thousands with a dot', () => {
  assert.equal(formatRp(300000), 'Rp.300.000');
  assert.equal(formatRp(1234567), 'Rp.1.234.567');
  assert.equal(formatRp(0), 'Rp.0');
  assert.equal(formatRp(999), 'Rp.999');
  assert.equal(formatRp(1000), 'Rp.1.000');
  assert.equal(formatRp(null), 'Rp.0');
  assert.equal(formatRp(2500.4), 'Rp.2.500');
  assert.equal(formatRp(2500.6), 'Rp.2.501');
});

test('formatShort compacts thousands / millions', () => {
  assert.equal(formatShort(500), '500');
  assert.equal(formatShort(12000), '12rb');
  assert.equal(formatShort(1500000), '1.5jt');
  assert.equal(formatShort(2000000), '2jt');
});

test('amountMatches uses an absolute tolerance', () => {
  assert.equal(MATCH_TOLERANCE, 1000);
  assert.equal(amountMatches(300000, 300000), true);
  assert.equal(amountMatches(300999, 300000), true);
  assert.equal(amountMatches(301000, 300000), false);
  assert.equal(amountMatches(null, 300000), false);
  assert.equal(amountMatches(undefined, 300000), false);
});
