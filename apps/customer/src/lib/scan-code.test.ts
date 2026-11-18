/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readScan } from './scan-code.ts';

test('a store code opens its merchant (case and spaces forgiven)', () => {
  assert.deepEqual(readScan('M:0F1E2D3C-4B5A-4978-8796-A5B4C3D2E1F0 '), { kind: 'merchant', merchantId: '0f1e2d3c-4b5a-4978-8796-a5b4c3d2e1f0' });
});

test('member and voucher codes are recognised as the cashier’s to scan', () => {
  assert.deepEqual(readScan('U:AB2CD3EF:287082'), { kind: 'member' });
  assert.deepEqual(readScan('R:0123456789abcdef'), { kind: 'voucher' });
});

test('anything else is not a UGNAYA code', () => {
  for (const text of ['', 'https://example.com', 'M:not-a-uuid', 'M:', 'U:short:1', 'R:XYZ']) assert.deepEqual(readScan(text), { kind: 'unknown' }, text);
});
