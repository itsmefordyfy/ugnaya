/// <reference types="node" />
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { test } from 'node:test';

import { base32Decode, hmacSha1, hotp, sha1, totpAt } from './totp.ts';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');
const ascii = (text: string) => new Uint8Array(Buffer.from(text, 'ascii'));

test('sha1 matches Node for empty, short, block-edge and long messages', () => {
  for (const length of [0, 3, 55, 56, 63, 64, 65, 119, 1000]) {
    const bytes = new Uint8Array(length).map((_, i) => (i * 31 + 7) & 0xff);
    assert.equal(hex(sha1(bytes)), createHash('sha1').update(bytes).digest('hex'), `length ${length}`);
  }
});

test('hmacSha1 matches Node, including a key longer than the block', () => {
  for (const keyLength of [20, 64, 80]) {
    const key = new Uint8Array(keyLength).map((_, i) => i);
    const message = ascii('The quick brown fox');
    assert.equal(hex(hmacSha1(key, message)), createHmac('sha1', key).update(message).digest('hex'));
  }
});

test('RFC 4226 appendix D HOTP values', () => {
  const secret = ascii('12345678901234567890');
  const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
  expected.forEach((code, counter) => assert.equal(hotp(secret, counter), code));
});

test('RFC 6238 appendix B SHA-1 TOTP values (last 6 digits)', () => {
  const secret = ascii('12345678901234567890');
  const vectors: [number, string][] = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ];
  for (const [seconds, code] of vectors) {
    assert.equal(hotp(secret, Math.floor(seconds / 30), 8), code, `t=${seconds}`);
    assert.equal(totpAt(secret, seconds * 1000).code, code.slice(2), `t=${seconds} (6 digits)`);
  }
});

test('secondsLeft counts down within the 30-second step', () => {
  const secret = ascii('12345678901234567890');
  assert.equal(totpAt(secret, 0).secondsLeft, 30);
  assert.equal(totpAt(secret, 29_000).secondsLeft, 1);
  assert.equal(totpAt(secret, 30_000).secondsLeft, 30);
});

test('base32Decode reads what the Edge Function writes (RFC 4648, no padding) and refuses other text', () => {
  assert.equal(Buffer.from(base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')!).toString('ascii'), '12345678901234567890');
  assert.equal(Buffer.from(base32Decode('mzxw6ytboi')!).toString('ascii'), 'foobar');
  assert.equal(base32Decode('not base32!'), null);
});
