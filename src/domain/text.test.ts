import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTitleCase } from './text';

test('toTitleCase capitalises each word, leaves the rest alone', () => {
  assert.equal(toTitleCase('rumah kita'), 'Rumah Kita');
  assert.equal(toTitleCase('gerry'), 'Gerry');
  assert.equal(toTitleCase('kos pak RT'), 'Kos Pak RT');
  assert.equal(toTitleCase('budi   santoso'), 'Budi   Santoso');
  assert.equal(toTitleCase(''), '');
  assert.equal(toTitleCase('a'), 'A');
});
