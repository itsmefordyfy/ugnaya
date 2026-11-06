// Lint config for the shared packages and scripts. The apps carry their own (Next.js and Expo).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['apps/**', 'supabase/**', '**/node_modules/**', '**/dist/**', '**/*.types.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
);
