import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelIndexes, niceMax, ticks } from './chart-scale.ts';

test('axis maxima are round and never zero', () => {
  assert.equal(niceMax(0), 1);
  assert.equal(niceMax(-3), 1);
  assert.equal(niceMax(1), 1);
  assert.equal(niceMax(7), 8);
  assert.equal(niceMax(43), 50);
  assert.equal(niceMax(1234), 1500);
  assert.equal(niceMax(100), 100);
});

test('ticks run from 0 to the max', () => {
  assert.deepEqual(ticks(8), [0, 2, 4, 6, 8]);
  assert.deepEqual(ticks(1), [0, 0.25, 0.5, 0.75, 1]);
});

test('date labels never crowd: first and last always, about six in all', () => {
  assert.deepEqual([...labelIndexes(5)].sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  const thirty = [...labelIndexes(30)].sort((a, b) => a - b);
  assert.equal(thirty[0], 0);
  assert.equal(thirty.at(-1), 29);
  assert.ok(thirty.length <= 7);
  for (let i = 1; i < thirty.length; i++) assert.ok(thirty[i] - thirty[i - 1] >= 3);
  assert.equal(labelIndexes(0).size, 0);
});
