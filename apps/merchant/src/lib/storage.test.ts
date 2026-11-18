import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentFileProblem, documentPath, formatBytes, isDocumentKind, logoFileProblem, logoPath, logoUrl, safeFileName } from './storage.ts';

const M = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('documents: PDF, JPEG, PNG or WebP up to 10 MB', () => {
  assert.equal(documentFileProblem({ type: 'application/pdf', size: 1000 }), null);
  assert.equal(documentFileProblem({ type: 'image/webp', size: 10 * 1024 * 1024 }), null);
  assert.match(documentFileProblem({ type: 'image/gif', size: 1000 }) ?? '', /PDF/);
  assert.match(documentFileProblem({ type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }) ?? '', /10 MB/);
  assert.match(documentFileProblem({ type: 'application/pdf', size: 0 }) ?? '', /empty/);
});

test('logos: images up to 2 MB, as the bucket allows', () => {
  assert.equal(logoFileProblem({ type: 'image/png', size: 2 * 1024 * 1024 }), null);
  assert.ok(logoFileProblem({ type: 'application/pdf', size: 10 }));
  assert.ok(logoFileProblem({ type: 'image/png', size: 2 * 1024 * 1024 + 1 }));
});

test('every path starts with the merchant id, which the storage policies check', () => {
  assert.equal(documentPath(M, 'a1b2', 'DTI permit (2026).pdf'), `${M}/a1b2-DTI-permit-2026-.pdf`);
  assert.equal(logoPath(M, 'x9', 'image/webp'), `${M}/logo-x9.webp`);
  assert.ok(documentPath(M, 'r', '../../etc/passwd').startsWith(`${M}/r-`));
  assert.ok(!documentPath(M, 'r', '../../etc/passwd').slice(M.length + 1).includes('/'));
});

test('file names are cleaned and kept short', () => {
  assert.equal(safeFileName('Café menu.png'), 'Cafe-menu.png');
  assert.equal(safeFileName('...'), 'file');
  assert.ok(safeFileName(`${'a'.repeat(200)}.pdf`).length <= 80);
  assert.ok(safeFileName(`${'a'.repeat(200)}.pdf`).endsWith('.pdf'));
});

test('kinds, sizes and the public logo address', () => {
  assert.equal(isDocumentKind('permit'), true);
  assert.equal(isDocumentKind('selfie'), false);
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.0 MB');
  assert.equal(logoUrl('https://x.supabase.co/', `${M}/logo-a.png`), `https://x.supabase.co/storage/v1/object/public/merchant-logos/${M}/logo-a.png`);
  assert.equal(logoUrl(undefined, 'p'), null);
});
