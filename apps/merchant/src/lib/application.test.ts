import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canEditDocuments, journeyStep, lockedExplanation, needsStatusBanner, STATUS_INFO } from './application.ts';

test('every status has a label and a plain summary', () => {
  for (const [status, info] of Object.entries(STATUS_INFO)) {
    assert.ok(info.label.length > 0, status);
    assert.ok(info.summary.endsWith('.'), status);
  }
  assert.equal(STATUS_INFO.info_required.label, 'Additional information required');
  assert.equal(STATUS_INFO.active.label, 'Approved');
});

test('documents are editable while the application is with the merchant, as the storage policy says', () => {
  assert.equal(canEditDocuments('draft'), true);
  // Once submitted, the documents are with UGNAYA until they ask for more (database rule, security review).
  assert.equal(canEditDocuments('pending_verification'), false);
  assert.equal(canEditDocuments('info_required'), true);
  for (const s of ['under_review', 'active', 'rejected', 'suspended', 'closed'] as const) assert.equal(canEditDocuments(s), false, s);
});

test('the journey moves forward with the status', () => {
  assert.equal(journeyStep('draft'), 0);
  assert.equal(journeyStep('pending_verification'), 1);
  assert.equal(journeyStep('under_review'), 2);
  assert.equal(journeyStep('info_required'), 2);
  assert.equal(journeyStep('active'), 3);
  assert.equal(journeyStep('rejected'), 3);
});

test('only an approved business hides the status banner; locked features explain themselves', () => {
  assert.equal(needsStatusBanner('active'), false);
  assert.equal(needsStatusBanner('draft'), true);
  assert.match(lockedExplanation('draft'), /approves/);
  assert.match(lockedExplanation('suspended'), /suspended/);
});
