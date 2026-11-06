import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colors } from './colors.ts';
import { toCssVariables } from './css.ts';

test('every colour appears in light, in the media dark block and in the data-theme dark block', () => {
  const css = toCssVariables();
  for (const key of Object.keys(colors.light)) {
    const name = `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    assert.equal(css.split(`${name}:`).length - 1, 3, `${name} should be set three times`);
  }
  assert.match(css, /--color-primary: #2B4ACB/);
  assert.match(css, /--color-primary: #6F86F0/);
  assert.match(css, /--space-4: 16px/);
  assert.match(css, /--radius-pill: 999px/);
});

test('light and dark sets name the same colours', () => {
  assert.deepEqual(Object.keys(colors.dark).sort(), Object.keys(colors.light).sort());
});
