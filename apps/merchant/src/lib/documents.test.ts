import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingKinds, parseDocumentRecord, parseReply } from './documents.ts';

const M = '0f8fad5b-d9cb-469f-a165-70867728950e';
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const VALID = { kind: 'permit', path: `${M}/ab12-permit.pdf`, fileName: 'permit.pdf', contentType: 'application/pdf', sizeBytes: '2048' };

test('a document uploaded into the merchant’s own folder is accepted', () => {
  const r = parseDocumentRecord(form(VALID), M);
  assert.deepEqual(r, { ok: true, value: { kind: 'permit', path: `${M}/ab12-permit.pdf`, fileName: 'permit.pdf', contentType: 'application/pdf', sizeBytes: 2048 } });
});

test('another merchant’s folder, a wrong kind, type or size is refused with a sentence', () => {
  assert.equal(parseDocumentRecord(form({ ...VALID, path: 'other/ab12-permit.pdf' }), M).ok, false);
  assert.equal(parseDocumentRecord(form({ ...VALID, path: `${M}/../x.pdf` }), M).ok, false);
  assert.equal(parseDocumentRecord(form({ ...VALID, kind: 'selfie' }), M).ok, false);
  assert.equal(parseDocumentRecord(form({ ...VALID, contentType: 'image/gif' }), M).ok, false);
  assert.equal(parseDocumentRecord(form({ ...VALID, sizeBytes: String(11 * 1024 * 1024) }), M).ok, false);
  assert.equal(parseDocumentRecord(form({ ...VALID, sizeBytes: '0' }), M).ok, false);
});

test('the checklist names what is still missing', () => {
  assert.deepEqual(missingKinds(['permit', 'other']), ['business_registration', 'owner_id', 'storefront_photo']);
  assert.deepEqual(missingKinds(['business_registration', 'permit', 'owner_id', 'storefront_photo']), []);
});

test('a reply is 1 to 2,000 characters', () => {
  assert.deepEqual(parseReply(form({ message: '  Here is the permit.  ' })), { ok: true, value: 'Here is the permit.' });
  assert.equal(parseReply(form({ message: '   ' })).ok, false);
  assert.equal(parseReply(form({ message: 'x'.repeat(2001) })).ok, false);
});
