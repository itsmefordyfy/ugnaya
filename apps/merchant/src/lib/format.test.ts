import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centavosToInput, formatPesos, formatPoints, fromManilaInput, parsePesos, toManilaInput } from './format.ts';

test('pesos typed by a person become whole centavos', () => {
  assert.equal(parsePesos('120'), 12000);
  assert.equal(parsePesos('1,250.5'), 125050);
  assert.equal(parsePesos('₱ 99.99'), 9999);
  assert.equal(parsePesos('PHP15'), 1500);
  assert.equal(parsePesos('0'), 0);
  assert.equal(parsePesos('-5'), null);
  assert.equal(parsePesos('1.234'), null);
  assert.equal(parsePesos('abc'), null);
  assert.equal(parsePesos(''), null);
});

test('centavos show as pesos', () => {
  assert.equal(formatPesos(125050), '₱1,250.50');
  assert.equal(formatPesos(39900, { whole: true }), '₱399');
  assert.equal(formatPesos(39950, { whole: true }), '₱399.50');
  assert.equal(centavosToInput(125050), '1250.50');
  assert.equal(centavosToInput(1000), '10');
  assert.equal(centavosToInput(null), '');
});

test('points are counted in words', () => {
  assert.equal(formatPoints(1), '1 point');
  assert.equal(formatPoints(1250), '1,250 points');
});

test('date inputs are read and written in Philippine time', () => {
  assert.equal(fromManilaInput('2026-11-07T09:30'), '2026-11-07T01:30:00.000Z');
  assert.equal(toManilaInput('2026-11-07T01:30:00.000Z'), '2026-11-07T09:30');
  assert.equal(fromManilaInput(''), null);
  assert.equal(fromManilaInput('tomorrow'), null);
});
