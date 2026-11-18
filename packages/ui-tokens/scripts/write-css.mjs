// Writes the tokens as CSS: node write-css.mjs <variablesFile> [tailwindThemeFile]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { toCssVariables, toTailwindTheme } from '../src/css.ts';

const [variablesOut, themeOut] = process.argv.slice(2);
if (!variablesOut) {
  console.error('usage: node write-css.mjs <variablesFile> [tailwindThemeFile]');
  process.exit(2);
}
for (const [out, css] of [[variablesOut, toCssVariables()], [themeOut, themeOut && toTailwindTheme()]]) {
  if (!out) continue;
  const path = resolve(process.cwd(), out);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, css);
  console.log(`wrote ${path}`);
}
