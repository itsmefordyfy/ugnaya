// Writes the tokens as CSS custom properties: node write-css.mjs <outFile>
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { toCssVariables } from '../src/css.ts';

const out = process.argv[2];
if (!out) {
  console.error('usage: node write-css.mjs <outFile>');
  process.exit(2);
}
const path = resolve(process.cwd(), out);
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, toCssVariables());
console.log(`wrote ${path}`);
