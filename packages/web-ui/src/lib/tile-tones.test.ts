import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio } from '@ugnaya/ui-tokens';
import { TILE_TONES } from './tile-tones.ts';

test('the glyph on every navigation tile has 3:1 contrast against both ends of its gradient (WCAG 1.4.11)', () => {
  const failures = Object.entries(TILE_TONES).flatMap(([name, t]) =>
    [t.from, t.to].flatMap((bg) => {
      const ratio = contrastRatio(t.glyph, bg);
      return ratio >= 3 ? [] : [`${name}: ${t.glyph} on ${bg} = ${ratio.toFixed(2)}`];
    }));
  assert.deepEqual(failures, []);
});

test('the tones are the board’s: purple, orange, yellow, blue, pink, teal', () => {
  assert.deepEqual(Object.keys(TILE_TONES).sort(), ['blue', 'orange', 'pink', 'purple', 'teal', 'yellow']);
});
