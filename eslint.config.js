// Lint config for the shared packages. The apps carry their own (Next.js and Expo).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['apps/**', 'supabase/**', '**/node_modules/**', '**/dist/**', '**/*.types.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
