import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaignColumns, campaignFilter, parseCampaignForm, statusesFor, visibleToCustomers } from './campaigns.ts';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

test('a campaign is read with dates in Philippine time', () => {
  const r = parseCampaignForm(form({ name: 'Double points Monday', kind: 'promotion', description: 'All day', status: 'scheduled', startsAt: '2026-11-09T08:00', endsAt: '2026-11-09T20:00' }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(campaignColumns(r.value), {
      name: 'Double points Monday', kind: 'promotion', description: 'All day',
      starts_at: '2026-11-09T00:00:00.000Z', ends_at: '2026-11-09T12:00:00.000Z', status: 'scheduled',
    });
  }
});

test('a draft needs no dates; a scheduled one needs a start; the end comes after the start', () => {
  assert.equal(parseCampaignForm(form({ name: 'Idea', kind: 'event', status: 'draft' })).ok, true);
  const noStart = parseCampaignForm(form({ name: 'Soon', kind: 'event', status: 'scheduled' }));
  assert.equal(noStart.ok, false);
  if (!noStart.ok) assert.ok(noStart.errors.startsAt);
  const backwards = parseCampaignForm(form({ name: 'Oops', kind: 'event', status: 'running', startsAt: '2026-11-09T10:00', endsAt: '2026-11-09T09:00' }));
  assert.equal(backwards.ok, false);
  if (!backwards.ok) assert.equal(backwards.errors.endsAt, 'The end must be after the start.');
});

test('unknown kinds and statuses, long text and short names are refused', () => {
  const r = parseCampaignForm(form({ name: 'A', kind: 'sale', status: 'live', description: 'x'.repeat(501) }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ['description', 'kind', 'name', 'status']);
});

test('customers see scheduled and running campaigns until they end, never drafts', () => {
  const now = new Date('2026-11-07T00:00:00Z');
  assert.equal(visibleToCustomers({ status: 'running', ends_at: null }, now), true);
  assert.equal(visibleToCustomers({ status: 'scheduled', ends_at: '2026-12-01T00:00:00Z' }, now), true);
  assert.equal(visibleToCustomers({ status: 'running', ends_at: '2026-11-01T00:00:00Z' }, now), false);
  assert.equal(visibleToCustomers({ status: 'draft', ends_at: null }, now), false);
  assert.equal(visibleToCustomers({ status: 'cancelled', ends_at: null }, now), false);
});

test('filter tabs map to statuses', () => {
  assert.equal(campaignFilter('nope'), 'all');
  assert.equal(statusesFor('all'), null);
  assert.deepEqual(statusesFor('live'), ['scheduled', 'running']);
  assert.deepEqual(statusesFor('past'), ['ended', 'cancelled']);
});
