import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMemberCode, formatRedemptionCode, parseMemberCode, parseRedemptionCode } from './member-code.ts';

test('a member code round-trips', () => {
  assert.equal(formatMemberCode('AB2CD3EF', '287082'), 'U:AB2CD3EF:287082');
  assert.deepEqual(parseMemberCode('U:AB2CD3EF:287082'), { memberId: 'AB2CD3EF', code: '287082' });
});
test('lowercase member ids and look-alike letters are refused', () => {
  assert.equal(parseMemberCode('U:ab2cd3ef:287082'), null);
  assert.equal(parseMemberCode('U:AB2CD3EO:287082'), null);
});
test('a web code starts with W', () => {
  assert.deepEqual(parseMemberCode('U:AB2CD3EF:WabcDEF123_-x'), { memberId: 'AB2CD3EF', code: 'WabcDEF123_-x' });
  assert.equal(parseMemberCode('U:AB2CD3EF:Wshort'), null);
});
test('redemption codes', () => {
  assert.equal(formatRedemptionCode('deadbeef'), 'R:deadbeef');
  assert.deepEqual(parseRedemptionCode('R:deadbeef'), { token: 'deadbeef' });
  assert.equal(parseRedemptionCode('R:not hex'), null);
});
test('anything else is not a code', () => {
  assert.equal(parseMemberCode('hello'), null);
  assert.equal(parseRedemptionCode('hello'), null);
  assert.equal(parseMemberCode('U:AB2CD3EF:28708'), null);
});
