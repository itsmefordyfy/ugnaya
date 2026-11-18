import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, csvRow, exportFileName, toCsv } from './csv.ts';

test('plain values pass through; empty values are empty', () => {
  assert.equal(csvCell('Kape ni Juan'), 'Kape ni Juan');
  assert.equal(csvCell(42), '42');
  assert.equal(csvCell(-20), '-20');
  assert.equal(csvCell(true), 'true');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(Number.NaN), '');
});

test('commas, quotes, line breaks and edge spaces are quoted', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('two\nlines'), '"two\nlines"');
  assert.equal(csvCell(' padded'), '" padded"');
});

test('text that a spreadsheet would run as a formula is neutralised', () => {
  assert.equal(csvCell('=HYPERLINK("http://evil","x")'), `"'=HYPERLINK(""http://evil"",""x"")"`);
  assert.equal(csvCell('+1-555'), "'+1-555");
  assert.equal(csvCell('-2+3'), "'-2+3");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('\tcmd'), `'\tcmd`);
  assert.equal(csvCell('a=b'), 'a=b');
});

test('a whole file has a byte-order mark, a header and CRLF lines', () => {
  const file = toCsv([{ header: 'Name', value: (r: { n: string }) => r.n }, { header: 'Points', value: () => 5 }], [{ n: 'A' }, { n: '=1' }]);
  assert.equal(file, "﻿Name,Points\r\nA,5\r\n'=1,5\r\n");
  assert.equal(csvRow(['x', 1, null]), 'x,1,');
  assert.equal(exportFileName('merchants', '2026-11-07'), 'ugnaya-merchants-2026-11-07.csv');
  assert.equal(exportFileName('../etc', '2026-11-07'), 'ugnaya-etc-2026-11-07.csv');
});
