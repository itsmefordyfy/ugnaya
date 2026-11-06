import { colors, type ColorSet } from './colors.ts';
import { radius, spacing, typography } from './scale.ts';

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const colorLines = (set: ColorSet, indent: string) =>
  Object.entries(set)
    .map(([key, value]) => `${indent}--color-${kebab(key)}: ${value};`)
    .join('\n');

/**
 * The tokens as CSS custom properties. Dark mode follows the system unless the page sets
 * data-theme="light"; data-theme="dark" forces it.
 */
export function toCssVariables(): string {
  const scale = [
    ...Object.entries(spacing).map(([key, value]) => `  --space-${key}: ${value}px;`),
    ...Object.entries(radius).map(([key, value]) => `  --radius-${key}: ${value}px;`),
    ...Object.entries(typography).flatMap(([key, style]) => [
      `  --font-${key}-size: ${style.size}px;`,
      `  --font-${key}-line: ${style.line}px;`,
      `  --font-${key}-weight: ${style.weight};`,
    ]),
  ].join('\n');

  return [
    '/* Generated from @ugnaya/ui-tokens. Do not edit. */',
    `:root {\n${colorLines(colors.light, '  ')}\n${scale}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${colorLines(colors.dark, '    ')}\n  }\n}`,
    `:root[data-theme="dark"] {\n${colorLines(colors.dark, '  ')}\n}`,
    '',
  ].join('\n');
}
