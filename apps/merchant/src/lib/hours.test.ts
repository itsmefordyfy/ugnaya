import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultHours, formatInterval, parseHoursForm, readHours, summarizeHours, type Hours } from './hours.ts';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const everyDay = (open: string, close: string) => Object.fromEntries(DAY_KEYS.flatMap((d) => [[`${d}_open_0`, open], [`${d}_close_0`, close]]));

test('the stored shape is one list of intervals per day', () => {
  const r = parseHoursForm(form({ ...everyDay('08:00', '20:00'), sun_closed: 'on' }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(Object.keys(r.value), DAY_KEYS);
    assert.deepEqual(r.value.mon, [{ open: '08:00', close: '20:00' }]);
    assert.deepEqual(r.value.sun, []);
  }
});

test('a lunch break is two intervals, sorted; overlaps and reversed times are refused', () => {
  const ok = parseHoursForm(form({ ...everyDay('08:00', '20:00'), mon_open_0: '15:00', mon_close_0: '21:00', mon_open_1: '07:00', mon_close_1: '11:00' }));
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.value.mon, [{ open: '07:00', close: '11:00' }, { open: '15:00', close: '21:00' }]);
  const overlap = parseHoursForm(form({ ...everyDay('08:00', '20:00'), tue_open_1: '19:00', tue_close_1: '22:00' }));
  assert.equal(overlap.ok, false);
  if (!overlap.ok) assert.match(overlap.errors.tue ?? '', /overlap/);
  const reversed = parseHoursForm(form({ ...everyDay('08:00', '20:00'), wed_open_0: '20:00', wed_close_0: '08:00' }));
  assert.equal(reversed.ok, false);
  if (!reversed.ok) assert.match(reversed.errors.wed ?? '', /after/);
});

test('a day needs hours or "closed"; half-filled times are refused', () => {
  const empty = parseHoursForm(form({ ...everyDay('08:00', '20:00'), thu_open_0: '', thu_close_0: '' }));
  assert.equal(empty.ok, false);
  const half = parseHoursForm(form({ ...everyDay('08:00', '20:00'), fri_close_0: '' }));
  assert.equal(half.ok, false);
  const bad = parseHoursForm(form({ ...everyDay('8am', '20:00') }));
  assert.equal(bad.ok, false);
});

test('stored hours are read defensively', () => {
  assert.equal(readHours(null), null);
  assert.equal(readHours([]), null);
  const h = readHours({ mon: [{ open: '08:00', close: '17:00' }, { open: 'x', close: 'y' }], tue: 'nope' });
  assert.deepEqual(h?.mon, [{ open: '08:00', close: '17:00' }]);
  assert.deepEqual(h?.tue, []);
  assert.deepEqual(h?.sun, []);
});

test('summaries group days with the same hours', () => {
  assert.equal(summarizeHours(defaultHours()), 'Every day 8:00 AM–8:00 PM');
  const h: Hours = { ...defaultHours(), sat: [], sun: [] };
  assert.equal(summarizeHours(h), 'Mon–Fri 8:00 AM–8:00 PM; Sat–Sun Closed');
  assert.equal(summarizeHours(null), 'Hours not set');
  assert.equal(formatInterval({ open: '00:00', close: '12:30' }), '12:00 AM–12:30 PM');
});
