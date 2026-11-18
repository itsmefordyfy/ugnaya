import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colors } from './colors.ts';
import { toCssVariables } from './css.ts';

test('every colour appears in light and in the data-theme dark block; the system theme is ignored', () => {
  const css = toCssVariables();
  for (const key of Object.keys(colors.light)) {
    const name = `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    assert.equal(css.split(`${name}:`).length - 1, 2, `${name} should be set twice (light, forced dark)`);
  }
  assert.match(css, /--color-primary: #1E2A78/);
  assert.match(css, /--color-primary: #8B97F0/);
  assert.doesNotMatch(css, /prefers-color-scheme/, 'light is the default whatever the system says');
  assert.match(css, /--color-reward: #FF6B35/);
  assert.match(css, /--space-4: 16px/);
  assert.match(css, /--radius-pill: 999px/);
});

test('light and dark sets name the same colours', () => {
  assert.deepEqual(Object.keys(colors.dark).sort(), Object.keys(colors.light).sort());
});

test('shadows, gradients and motion are emitted, and dark surfaces have no shadow', () => {
  const css = toCssVariables();
  assert.match(css, /--shadow-md: 0 4px 12px/);
  assert.equal(css.split('--shadow-md: none;').length - 1, 1, 'none in the forced dark block only');
  assert.match(css, /--gradient-brand: linear-gradient\(135deg, #1E2A78, #7C3AED\)/);
  assert.match(css, /--duration-count-up: 600ms/);
});

test('the Tailwind theme maps every colour, radius and shadow to its CSS variable', async () => {
  const { toTailwindTheme } = await import('./css.ts');
  const theme = toTailwindTheme();
  assert.match(theme, /^@theme inline \{/m);
  for (const key of Object.keys(colors.light)) {
    const name = `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    assert.ok(theme.includes(`  ${name}: var(${name});`), `${name} should be mapped`);
  }
  assert.ok(theme.includes('--radius-pill: var(--radius-pill);'));
  assert.ok(theme.includes('--shadow-lg: var(--shadow-lg);'));
});
