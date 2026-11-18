import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alignmentPatternPositions, dataCodewords, encodeQr, formatBits, numDataCodewords, qrPath, reedSolomonDivisor,
  reedSolomonRemainder, storeQrText, versionBits, versionFor,
} from './qr.ts';

test('data capacity at level M matches the standard’s table (versions 1 to 10)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(numDataCodewords), [16, 28, 44, 64, 86, 108, 124, 154, 182, 216]);
});

test('the smallest version that fits is chosen', () => {
  assert.equal(versionFor(14), 1);
  assert.equal(versionFor(15), 2);
  assert.equal(versionFor(38), 3, 'a store QR (M: plus a UUID) is version 3');
  assert.equal(versionFor(213), 10);
  assert.equal(versionFor(214), null);
});

test('format and version information match the standard’s tables', () => {
  assert.equal(formatBits(0, 0), 0b101010000010010, 'level M, mask 0');
  assert.equal(formatBits(1, 0), 0b111011111000100, 'level L, mask 0');
  assert.equal(formatBits(0, 5), 0b100000011001110, 'level M, mask 5');
  assert.equal(formatBits(0, 7), 0b100101010100000, 'level M, mask 7');
  assert.equal(versionBits(7), 0x07c94);
  assert.equal(versionBits(10), 0x0a4d3);
});

test('Reed-Solomon error correction matches published examples', () => {
  // "HELLO WORLD", version 1-M (thonky.com's worked example).
  const hello = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(reedSolomonRemainder(hello, reedSolomonDivisor(10)), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  // "01234567", version 1-M (ISO/IEC 18004, Annex I).
  const numeric = [0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11];
  assert.deepEqual(reedSolomonRemainder(numeric, reedSolomonDivisor(10)), [0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55]);
});

test('byte-mode data is framed, terminated and padded with 0xEC 0x11', () => {
  const words = dataCodewords([...new TextEncoder().encode('A')], 1);
  assert.equal(words.length, 16);
  // 0100 (byte mode) 00000001 (count) 01000001 ('A') 0000 (terminator), then padding.
  assert.deepEqual(words.slice(0, 4), [0x40, 0x14, 0x10, 0xec]);
  assert.deepEqual(words.slice(4, 6), [0x11, 0xec]);
});

test('alignment patterns sit where the standard puts them', () => {
  assert.deepEqual(alignmentPatternPositions(1), []);
  assert.deepEqual(alignmentPatternPositions(3), [6, 22]);
  assert.deepEqual(alignmentPatternPositions(7), [6, 22, 38]);
  assert.deepEqual(alignmentPatternPositions(10), [6, 28, 50]);
});

const finderAt = (m: boolean[][], x0: number, y0: number) => {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      if (m[y0 + dy][x0 + dx] !== (ring !== 2)) return false;
    }
  }
  return true;
};

test('a store QR has the three finder patterns, timing lines, the dark module and the chosen mask in its format bits', () => {
  const qr = encodeQr(storeQrText('0f8fad5b-d9cb-469f-a165-70867728950e'));
  assert.equal(qr.version, 3);
  assert.equal(qr.size, 29);
  assert.ok(finderAt(qr.modules, 0, 0) && finderAt(qr.modules, qr.size - 7, 0) && finderAt(qr.modules, 0, qr.size - 7));
  for (let i = 8; i < qr.size - 8; i++) {
    assert.equal(qr.modules[6][i], i % 2 === 0);
    assert.equal(qr.modules[i][6], i % 2 === 0);
  }
  assert.equal(qr.modules[qr.size - 8][8], true, 'dark module');
  // Read the first copy of the format bits back.
  const bits = formatBits(0, qr.mask);
  const read = [0, 1, 2, 3, 4, 5].map((i) => qr.modules[i][8]);
  assert.deepEqual(read, [0, 1, 2, 3, 4, 5].map((i) => ((bits >>> i) & 1) === 1));
});

test('encoding is deterministic and the mask is a valid choice', () => {
  const a = encodeQr('M:abc');
  const b = encodeQr('M:abc');
  assert.deepEqual(a, b);
  assert.ok(a.mask >= 0 && a.mask <= 7);
  for (let mask = 0; mask < 8; mask++) assert.equal(encodeQr('M:abc', mask).mask, mask);
  assert.match(qrPath(a), /^M\d+,\d+h1v1h-1z/);
  assert.throws(() => encodeQr('x'.repeat(300)), RangeError);
});
