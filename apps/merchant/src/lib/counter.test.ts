import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  awardOutcome, errorOutcome, isIdempotencyKey, looksLikeMemberCode, looksLikeVoucherCode, normalizeMemberCode,
  normalizeVoucherCode, parseAwardForm, parseRedeemForm, redeemOutcome,
} from './counter.ts';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const KEY = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const AWARD = { branchId: 'b1', memberCode: 'U:ABCD2345:123456', amount: '250.50', receiptNo: '', idempotencyKey: KEY };

test('codes are tidied before checking: case, spaces, a bare voucher token', () => {
  assert.equal(normalizeMemberCode(' u:abcd2345:123456 '), 'U:ABCD2345:123456');
  assert.equal(normalizeMemberCode('U:ABCD2345:Wabc_DEF-12345'), 'U:ABCD2345:Wabc_DEF-12345', 'the web code keeps its case');
  assert.equal(normalizeVoucherCode('r:ABCDEF0123'), 'R:abcdef0123');
  assert.equal(normalizeVoucherCode('abcdef0123'), 'R:abcdef0123');
  assert.equal(looksLikeMemberCode('U:ABCD2345:123456'), true);
  assert.equal(looksLikeMemberCode('M:0f8fad5b-d9cb-469f-a165-70867728950e'), false, 'a store QR is not a member code');
  assert.equal(looksLikeVoucherCode('R:abcdef0123'), true);
  assert.equal(looksLikeVoucherCode('U:ABCD2345:123456'), false);
});

test('a complete award form becomes centavos, a trimmed receipt and the same key', () => {
  const r = parseAwardForm(form({ ...AWARD, receiptNo: ' OR-1001 ' }));
  assert.deepEqual(r, { ok: true, value: { branchId: 'b1', memberCode: 'U:ABCD2345:123456', amountCentavos: 25050, receiptNo: 'OR-1001', idempotencyKey: KEY } });
  const noReceipt = parseAwardForm(form(AWARD));
  assert.ok(noReceipt.ok && noReceipt.value.receiptNo === null);
});

test('award mistakes are caught next to the field', () => {
  const r = parseAwardForm(form({ ...AWARD, memberCode: 'U:SHORT:1', amount: '0' }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.fieldErrors).sort(), ['amount', 'memberCode']);
  const big = parseAwardForm(form({ ...AWARD, amount: '30000.01' }));
  assert.ok(!big.ok && big.fieldErrors.amount);
});

test('no branch or no key is never sent', () => {
  assert.equal(parseAwardForm(form({ ...AWARD, branchId: '' })).ok, false);
  assert.equal(parseAwardForm(form({ ...AWARD, idempotencyKey: '' })).ok, false);
  assert.equal(parseRedeemForm(form({ branchId: 'b1', voucherCode: 'R:abcdef0123', idempotencyKey: 'x' })).ok, false);
  assert.equal(isIdempotencyKey(KEY), true);
  assert.equal(isIdempotencyKey('a'.repeat(101)), false);
});

test('a redeem form needs a voucher code', () => {
  assert.deepEqual(parseRedeemForm(form({ branchId: 'b1', voucherCode: 'abcdef0123', idempotencyKey: KEY })),
    { ok: true, value: { branchId: 'b1', code: 'R:abcdef0123', idempotencyKey: KEY } });
  const bad = parseRedeemForm(form({ branchId: 'b1', voucherCode: 'U:ABCD2345:123456', idempotencyKey: KEY }));
  assert.ok(!bad.ok && bad.fieldErrors.voucherCode);
});

test('results are read from the functions’ jsonb, replays included', () => {
  assert.deepEqual(awardOutcome({ transaction_id: 't', replayed: true, merchant: { program_id: 'p', points_earned: 25, balance: 140 },
    network: { points_earned: 12, balance: 40, available_at: '2026-11-14T00:00:00Z' } }),
  { kind: 'award', transactionId: 't', replayed: true, pointsEarned: 25, balance: 140, network: { pointsEarned: 12, availableAt: '2026-11-14T00:00:00Z' } });
  assert.deepEqual(awardOutcome({ transaction_id: 't', replayed: false, merchant: null, network: null }).network, null);
  assert.deepEqual(redeemOutcome({ transaction_id: 't', replayed: false, redemption_id: 'r', reward_id: 'w', reward_name: 'Free iced coffee', points_cost: 60, balance: 15 }),
    { kind: 'redeem', transactionId: 't', replayed: false, rewardName: 'Free iced coffee', pointsCost: 60, balance: 15 });
  assert.equal(awardOutcome(null).pointsEarned, 0);
});

test('every refusal has a sentence and one next step', () => {
  for (const code of ['invalid_member_code', 'merchant_inactive', 'staff_not_allowed', 'token_used', 'token_expired', 'insufficient_points', 'monthly_cap']) {
    const e = errorOutcome({ message: code });
    assert.equal(e.kind, 'error');
    assert.ok(e.message.length > 10 && e.nextStep.length > 10, code);
    assert.notEqual(e.nextStep, errorOutcome({ message: 'something_else' }).nextStep, code);
  }
});
