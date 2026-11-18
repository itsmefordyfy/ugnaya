import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBranchForm } from './branches.ts';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const OPEN = Object.fromEntries(DAY_KEYS.flatMap((d) => [[`${d}_open_0`, '08:00'], [`${d}_close_0`, '20:00']]));

test('a branch with a name and hours is enough; coordinates are optional', () => {
  const r = parseBranchForm(form({ ...OPEN, name: 'Main', active: 'on' }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.lat, null);
    assert.equal(r.value.active, true);
    assert.deepEqual(r.value.hours.mon, [{ open: '08:00', close: '20:00' }]);
  }
  const off = parseBranchForm(form({ ...OPEN, name: 'Old site' }));
  assert.equal(off.ok && off.value.active, false);
});

test('coordinates come in pairs, in range, rounded to 6 decimals', () => {
  const r = parseBranchForm(form({ ...OPEN, name: 'Main', lat: '13.62183456', lng: '123.1948' }));
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual([r.value.lat, r.value.lng], [13.621835, 123.1948]);
  assert.equal(parseBranchForm(form({ ...OPEN, name: 'Main', lat: '13.6' })).ok, false);
  assert.equal(parseBranchForm(form({ ...OPEN, name: 'Main', lat: '91', lng: '0' })).ok, false);
  assert.equal(parseBranchForm(form({ ...OPEN, name: 'Main', lat: 'north', lng: '0' })).ok, false);
});

test('a missing name or bad hours are reported per field', () => {
  const r = parseBranchForm(form({ ...OPEN, name: '', mon_close_0: '07:00' }));
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.name);
    assert.ok(r.errors.hours?.mon);
  }
});
