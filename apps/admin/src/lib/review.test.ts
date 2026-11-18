import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedReviewActions, reasonRequired } from './review.ts';

const OPS = ['merchants.view', 'merchants.review', 'merchants.suspend'];

test('each status offers only the moves the database allows', () => {
  assert.deepEqual(allowedReviewActions('pending_verification', OPS), ['start_review', 'request_info', 'approve', 'reject']);
  assert.deepEqual(allowedReviewActions('under_review', OPS), ['request_info', 'approve', 'reject']);
  assert.deepEqual(allowedReviewActions('info_required', OPS), ['start_review', 'approve', 'reject']);
  assert.deepEqual(allowedReviewActions('rejected', OPS), ['reopen']);
  assert.deepEqual(allowedReviewActions('active', OPS), ['suspend']);
  assert.deepEqual(allowedReviewActions('suspended', OPS), ['reactivate']);
  assert.deepEqual(allowedReviewActions('draft', OPS), []);
  assert.deepEqual(allowedReviewActions('closed', OPS), []);
});

test('permissions narrow the moves', () => {
  assert.deepEqual(allowedReviewActions('pending_verification', ['merchants.view']), []);
  assert.deepEqual(allowedReviewActions('active', ['merchants.review']), []);
  assert.deepEqual(allowedReviewActions('active', ['merchants.suspend']), ['suspend']);
  assert.deepEqual(allowedReviewActions('rejected', ['merchants.suspend']), []);
});

test('reasons', () => {
  assert.equal(reasonRequired('approve'), false);
  assert.equal(reasonRequired('start_review'), false);
  for (const a of ['request_info', 'reject', 'reopen', 'suspend', 'reactivate'] as const) assert.equal(reasonRequired(a), true, a);
});
