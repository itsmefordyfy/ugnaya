import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The shared packages ship TypeScript source.
  transpilePackages: ['@ugnaya/ui-tokens', '@ugnaya/rules', '@ugnaya/db'],
  turbopack: {
    // The monorepo root, where node_modules and the packages live.
    root: path.resolve(import.meta.dirname, '../..'),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
