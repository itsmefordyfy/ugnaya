import { colors, gradients, type ColorSet } from './colors.ts';
import { easing, motion, radius, shadows, spacing, typography } from './scale.ts';

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const colorLines = (set: ColorSet, indent: string) =>
  Object.entries(set)
    .map(([key, value]) => `${indent}--color-${kebab(key)}: ${value};`)
    .join('\n');

const shadowLines = (set: Record<string, string>, indent: string) =>
  Object.entries(set)
    .map(([key, value]) => `${indent}--shadow-${key}: ${value};`)
    .join('\n');

const gradient = (g: { angle: number; stops: readonly string[] }) => `linear-gradient(${g.angle}deg, ${g.stops.join(', ')})`;

/**
 * The tokens as CSS custom properties. Light is the default and ignores the system's setting (owner's
 * call, 2026-11-06); a page opts into dark with data-theme="dark" (a future toggle).
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
    ...Object.entries(motion).map(([key, value]) => `  --duration-${kebab(key)}: ${value}ms;`),
    `  --ease-enter: ${easing.enter};`,
    `  --ease-exit: ${easing.exit};`,
    `  --gradient-brand: ${gradient(gradients.brand)};`,
    `  --gradient-reward: ${gradient(gradients.reward)};`,
    // The brand wash: a faint accent glow from the top of marketing and wallet pages.
    '  --gradient-wash: radial-gradient(ellipse 80% 480px at 50% 0, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent);',
  ].join('\n');

  return [
    '/* Generated from @ugnaya/ui-tokens. Do not edit. */',
    `:root {\n${colorLines(colors.light, '  ')}\n${shadowLines(shadows.light, '  ')}\n${scale}\n}`,
    `:root[data-theme="dark"] {\n${colorLines(colors.dark, '  ')}\n${shadowLines(shadows.dark, '  ')}\n}`,
    '',
  ].join('\n');
}

/**
 * Tailwind 4's @theme block for the same tokens, so utilities like bg-accent-soft and rounded-pill follow
 * the CSS variables (and so the theme, light or dark). `inline` keeps the var() reference in the utility.
 */
export function toTailwindTheme(): string {
  const lines = [
    ...Object.keys(colors.light).map((key) => `--color-${kebab(key)}`),
    ...Object.keys(radius).map((key) => `--radius-${key}`),
    ...Object.keys(shadows.light).map((key) => `--shadow-${key}`),
  ].map((name) => `  ${name}: var(${name});`);
  return ['/* Generated from @ugnaya/ui-tokens. Do not edit. */', '@theme inline {', ...lines, '}', ''].join('\n');
}
