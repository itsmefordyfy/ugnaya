/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AppError, errorCode, errorMessage, GENERAL_ERROR } from './errors.ts';

test('raise_code messages, auth codes and app errors become their code', () => {
  assert.equal(errorCode({ message: 'customer_unknown', code: 'P0001' }), 'customer_unknown');
  assert.equal(errorCode({ message: 'Invalid login credentials', code: 'invalid_credentials' }), 'invalid_credentials');
  assert.equal(errorCode(new AppError('insufficient_points')), 'insufficient_points');
});

test('network failures and missing functions are recognised', () => {
  assert.equal(errorCode(new TypeError('Network request failed')), 'network');
  assert.equal(errorCode({ message: 'Could not find the function public.customer_home(p_lat, p_lng) in the schema cache', code: 'PGRST202' }), 'function_missing');
});

test('unknown errors get the general line, never the raw text', () => {
  assert.equal(errorMessage({ message: 'duplicate key value violates unique constraint "x"' }), GENERAL_ERROR);
  assert.equal(errorMessage(null), GENERAL_ERROR);
  assert.match(errorMessage({ message: 'merchant_not_found' }), /isn’t on UGNAYA/);
});
