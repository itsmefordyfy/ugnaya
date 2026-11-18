/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hoursLines } from './hours.ts';

test('a day map, in weekday order, with closed days', () => {
  assert.deepEqual(hoursLines({ tue: '08:00-20:00', mon: { open: '08:00', close: '20:00' }, sun: null }), ['Mon: 08:00–20:00', 'Tue: 08:00–20:00', 'Sun: Closed']);
});

test('a note, a list of lines, a list of day objects', () => {
  assert.deepEqual(hoursLines('Daily 7 AM – 9 PM'), ['Daily 7 AM – 9 PM']);
  assert.deepEqual(hoursLines(['Mon–Fri 8–6', 'Sat 9–3']), ['Mon–Fri 8–6', 'Sat 9–3']);
  assert.deepEqual(hoursLines([{ day: 'saturday', open: '9:00', close: '15:00' }, { day: 'Sunday', closed: true }]), ['Sat: 9:00–15:00', 'Sun: Closed']);
});

test('nothing usable gives no lines', () => {
  for (const value of [null, undefined, 42, {}, [], { weird: 1 }]) assert.deepEqual(hoursLines(value), []);
});
