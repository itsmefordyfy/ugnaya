import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colors, gradients, type ColorSet } from './colors.ts';
import { contrastRatio } from './contrast.ts';

test('contrastRatio matches the WCAG reference values', () => {
  assert.equal(contrastRatio('#FFFFFF', '#000000'), 21);
  assert.equal(contrastRatio('#1E2A78', '#FFFFFF').toFixed(2), '12.67');
  assert.equal(contrastRatio('#FFFFFF', '#FF6B35').toFixed(2), '2.84'); // why orange never carries white text
});

type Pair = [fg: keyof ColorSet, bg: keyof ColorSet, floor: number];

// 4.5 for text, 3 for control outlines (WCAG 1.4.11). docs/BRAND_AND_DESIGN_SYSTEM.md sections 2.2 to 2.4.
const TEXT = 4.5;
const UI = 3;
const PAIRS: Pair[] = [
  // Body and supporting text on both page surfaces.
  ...(['surface', 'card'] as const).flatMap((bg): Pair[] => [
    ['ink', bg, TEXT],
    ['inkMuted', bg, TEXT],
    ['inkSubtle', bg, TEXT],
    ['logoWordmark', bg, TEXT],
    ['borderStrong', bg, UI],
    // Text-safe brand shades used as text on a page surface.
    ['primary', bg, TEXT],
    ['accent', bg, TEXT],
    ['accentText', bg, TEXT],
    ['rewardText', bg, TEXT],
    ['pointsText', bg, TEXT],
    ['successText', bg, TEXT],
    ['warning', bg, TEXT],
    ['danger', bg, TEXT],
    ['info', bg, TEXT],
  ]),
  // Text on a filled button or badge.
  ['onPrimary', 'primary', TEXT],
  ['onAccent', 'accent', TEXT],
  ['onReward', 'reward', TEXT],
  ['onPoints', 'points', TEXT],
  ['onSuccess', 'success', TEXT],
  ['onDanger', 'danger', TEXT],
  // Text on a soft tint.
  ['primary', 'primarySoft', TEXT],
  ['accentText', 'accentSoft', TEXT],
  ['rewardText', 'rewardSoft', TEXT],
  ['pointsText', 'pointsSoft', TEXT],
  ['successText', 'successSoft', TEXT],
  ['warningText', 'warningSoft', TEXT],
  ['dangerText', 'dangerSoft', TEXT],
  ['infoText', 'infoSoft', TEXT],
  ['ink', 'primarySoft', TEXT],
];

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} theme: every text/background pair meets its contrast floor`, () => {
    const set = colors[theme];
    const failures = PAIRS.flatMap(([fg, bg, floor]) => {
      const ratio = contrastRatio(set[fg], set[bg]);
      return ratio >= floor ? [] : [`${fg} ${set[fg]} on ${bg} ${set[bg]} = ${ratio.toFixed(2)} (needs ${floor})`];
    });
    assert.deepEqual(failures, []);
  });
}

test('the brand colours keep their documented roles', () => {
  assert.equal(colors.light.primary, '#1E2A78');
  assert.equal(colors.light.accent, '#7C3AED');
  assert.equal(colors.light.reward, '#FF6B35');
  assert.equal(colors.light.points, '#FFC247');
  assert.equal(colors.light.success, '#14B8A6');
  assert.equal(colors.light.surface, '#F8FAFC');
});

test('orange, yellow and teal fills carry dark ink, never white', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const fill of ['reward', 'points', 'success'] as const) {
      const on = colors[theme][`on${fill[0].toUpperCase()}${fill.slice(1)}` as 'onReward'];
      assert.notEqual(on.toUpperCase(), '#FFFFFF', `${theme} ${fill} must not carry white text`);
    }
  }
});

test('gradient text stays readable at both ends', () => {
  const [navy, purple] = gradients.brand.stops;
  // The gradient is the same in both themes, so its text colour is fixed too (on-primary flips to dark in dark mode).
  for (const theme of ['light', 'dark'] as const) {
    assert.ok(contrastRatio(colors[theme].onGradient, navy) >= TEXT, `${theme} text on the navy end`);
    assert.ok(contrastRatio(colors[theme].onGradient, purple) >= TEXT, `${theme} text on the purple end`);
  }
  const [orange, yellow] = gradients.reward.stops;
  assert.ok(contrastRatio(colors.light.onReward, orange) >= TEXT);
  assert.ok(contrastRatio(colors.light.onReward, yellow) >= TEXT);
});
