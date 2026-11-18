import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARK } from './geometry.ts';
import { INK, WHITE } from './colors.ts';
import { appIconSvg, layoutOf, logoSvg, LAYOUTS, TONES, type Layout, type Tone } from './svg.ts';

const viewBoxOf = (svg: string) => {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  assert.ok(m, 'has a viewBox');
  return { width: Number(m[1]), height: Number(m[2]) };
};

test('the mark keeps the board’s proportions (about 1.09 wide for 1 high)', () => {
  const ratio = MARK.width / MARK.height;
  assert.ok(ratio > 1.05 && ratio < 1.15, `ratio ${ratio}`);
  assert.equal(MARK.pieces.length, 4);
});

test('every layout in every tone is a well-formed svg with no NaN', () => {
  for (const layout of LAYOUTS) {
    for (const tone of TONES) {
      const svg = logoSvg({ layout, tone });
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${layout}/${tone}`);
      assert.equal((svg.match(/<svg/g) ?? []).length, 1);
      assert.ok(svg.endsWith('</svg>'));
      assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `${layout}/${tone} has a bad number`);
      const { width, height } = viewBoxOf(svg);
      assert.ok(width > 0 && height > 0);
    }
  }
});

test('in lockups the mark, wordmark and tagline never overlap and all sit inside the viewBox', () => {
  for (const layout of ['horizontal', 'tagline', 'vertical'] as Layout[]) {
    const l = layoutOf(layout);
    const boxes = [l.markBox, l.wordmarkBox, ...(l.taglineBox ? [l.taglineBox] : [])];
    for (const b of boxes) {
      assert.ok(b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= l.width + 0.5 && b.y + b.height <= l.height + 0.5, `${layout} box inside`);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        assert.ok(apart, `${layout}: boxes ${i} and ${j} overlap`);
      }
    }
  }
});

test('colour tones: full has four gradients; mono and white have none and use one colour', () => {
  assert.equal((logoSvg({ layout: 'mark', tone: 'full' }).match(/<linearGradient/g) ?? []).length, 4);
  const white = logoSvg({ layout: 'horizontal', tone: 'white' });
  assert.ok(!white.includes('linearGradient') && !white.includes(INK));
  assert.ok(white.includes(`fill="${WHITE}"`));
  const mono = logoSvg({ layout: 'horizontal', tone: 'mono' });
  assert.ok(!mono.includes('linearGradient') && mono.includes(`fill="${INK}"`));
  const dark = logoSvg({ layout: 'horizontal', tone: 'onDark' });
  assert.equal((dark.match(/<linearGradient/g) ?? []).length, 4, 'full-colour mark on dark');
  assert.ok(dark.includes(`fill="${WHITE}"`) && !dark.includes(`fill="${INK}"`), 'white wordmark on dark');
});

test('gradient ids are unique per prefix so two logos can share one page', () => {
  const a = logoSvg({ layout: 'mark', tone: 'full', idPrefix: 'a' });
  const b = logoSvg({ layout: 'mark', tone: 'full', idPrefix: 'b' });
  const ids = [...(a + b).matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, ref] of (a + b).matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), `${ref} is defined`);
});

test('the tagline layout carries the orange underline; the others do not', () => {
  assert.ok(logoSvg({ layout: 'tagline', tone: 'full' }).includes('#FF6B35'));
  assert.ok(!logoSvg({ layout: 'horizontal', tone: 'full' }).includes('#FF6B35'));
});

test('app icons: iOS icon is an opaque square, the light one is white, the foreground has no background', () => {
  const primary = appIconSvg({ kind: 'primary', rounded: false });
  assert.ok(!primary.includes(' rx='), 'square: the system rounds it');
  assert.equal(viewBoxOf(primary).width, 1024);
  assert.ok(appIconSvg({ kind: 'primary', rounded: true }).includes(' rx='));
  assert.ok(appIconSvg({ kind: 'light', rounded: false }).includes(`fill="${WHITE}"`));
  const fg = appIconSvg({ kind: 'foreground', rounded: false });
  assert.ok(!fg.includes('<rect'), 'transparent layer');
  const mono = appIconSvg({ kind: 'monochromeLayer', rounded: false });
  assert.ok(!mono.includes('linearGradient') && !mono.includes('<rect'));
});

test('tone and layout lists are what the design system documents', () => {
  assert.deepEqual([...LAYOUTS], ['mark', 'horizontal', 'tagline', 'vertical']);
  assert.deepEqual([...TONES] as Tone[], ['full', 'onDark', 'mono', 'white']);
});

test('textColor overrides the wordmark, trademark and tagline colour (for theme-aware use) and nothing else', () => {
  const svg = logoSvg({ layout: 'tagline', tone: 'full', textColor: 'var(--color-logo-wordmark)' });
  assert.ok(svg.includes('fill="var(--color-logo-wordmark)"'));
  assert.ok(!svg.includes(`fill="${INK}"`), 'no hard-coded navy text left');
  assert.equal((svg.match(/<linearGradient/g) ?? []).length, 4, 'the mark keeps its gradients');
  assert.ok(svg.includes('#FF6B35'), 'the underline keeps its orange');
});

test('in the horizontal logo the wordmark is centred vertically on the symbol', () => {
  const l = layoutOf('horizontal');
  const wordCentre = l.wordmarkBox.y + l.wordmarkBox.height / 2;
  assert.ok(Math.abs(wordCentre - l.markBox.height / 2) < 0.5, `word centre ${wordCentre} vs mark centre ${l.markBox.height / 2}`);
});
