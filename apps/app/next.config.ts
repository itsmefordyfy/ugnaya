import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The shared packages ship TypeScript source.
  // 90 is used for Ugi (soft transparent edges); 75 is Next's default for everything else.
  images: { qualities: [75, 90] },
  transpilePackages: ['@ugnaya/ui-tokens', '@ugnaya/brand', '@ugnaya/web-ui', '@ugnaya/rules', '@ugnaya/db'],
  turbopack: {
    root: path.resolve(import.meta.dirname, '../..'),
    rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
  },
  // The product is private: signed-in pages and account data must never be indexed or framed.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
