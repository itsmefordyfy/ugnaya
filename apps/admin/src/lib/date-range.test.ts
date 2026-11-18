import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dayBounds, dayCount, parseDay, parseRange } from './date-range.ts';

const TODAY = '2026-11-07';

test('presets end today and include it', () => {
  assert.deepEqual(parseRange({ range: '7' }, TODAY), { preset: '7', from: '2026-11-01', to: TODAY, days: 7 });
  assert.equal(parseRange({ range: '90' }, TODAY).from, '2026-08-10');
  assert.equal(parseRange({}, TODAY).preset, '30');
  assert.equal(parseRange({ range: 'nonsense' }, TODAY).days, 30);
});

test('a valid custom range is kept', () => {
  assert.deepEqual(parseRange({ range: 'custom', from: '2026-10-01', to: '2026-10-31' }, TODAY),
    { preset: 'custom', from: '2026-10-01', to: '2026-10-31', days: 31 });
  assert.equal(parseRange({ range: 'custom', from: '2026-10-05', to: '2026-10-05' }, TODAY).days, 1);
});

test('a broken custom range falls back to 30 days and says why', () => {
  const missing = parseRange({ range: 'custom', from: '2026-10-01' }, TODAY);
  assert.equal(missing.preset, '30');
  assert.ok(missing.error);
  assert.ok(parseRange({ range: 'custom', from: '2026-11-05', to: '2026-11-01' }, TODAY).error);
  assert.ok(parseRange({ range: 'custom', from: '2024-01-01', to: '2026-11-01' }, TODAY).error);
  assert.ok(parseRange({ range: 'custom', from: '2026-02-30', to: '2026-03-01' }, TODAY).error);
  assert.ok(parseRange({ range: 'custom', from: ['2026-01-01', 'x'], to: "2026-01-02'; drop" }, TODAY).error);
});

test('day helpers', () => {
  assert.equal(parseDay('2026-02-29'), null);
  assert.equal(parseDay('2028-02-29'), '2028-02-29');
  assert.equal(parseDay(42), null);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dayCount('2026-01-01', '2026-12-31'), 365);
  assert.deepEqual(dayBounds('2026-11-01', '2026-11-07'), { since: '2026-11-01T00:00:00Z', until: '2026-11-08T00:00:00Z' });
  assert.deepEqual(dayBounds('', 'bad'), { since: null, until: null });
});
