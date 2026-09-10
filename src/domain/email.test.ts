import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isValidEmail, normalizeEmail } from './email';

test('isValidEmail: accepts real addresses, rejects near-misses', () => {
  for (const ok of [
    'a@b.com',
    'gerry.august1997@gmail.com',
    'admin@sub.domain.co.id',
    '  spaced@domain.io  ',
  ]) {
    assert.equal(isValidEmail(ok), true, ok);
  }
  for (const bad of [
    '',
    'plainstring',
    'a@b',
    'a@b.',
    'a@b.c',
    'a@b.123',
    'a b@c.com',
    'a@@b.com',
    null,
    undefined,
  ]) {
    assert.equal(isValidEmail(bad as string), false, String(bad));
  }
});

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Gerry@Example.COM '), 'gerry@example.com');
});
