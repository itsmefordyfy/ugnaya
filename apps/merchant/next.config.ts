import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // 90 is used for Ugi (soft transparent edges); 75 is Next's default for everything else.
  images: { qualities: [75, 90] },
  // The shared packages ship TypeScript source.
  transpilePackages: ['@ugnaya/ui-tokens', '@ugnaya/brand', '@ugnaya/web-ui', '@ugnaya/rules', '@ugnaya/db'],
  turbopack: {
    root: path.resolve(import.meta.dirname, '../..'),
    rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
  },
  // The merchant portal is private: never indexed or framed. The camera is allowed for this origin only (the counter
  // scans member and voucher codes); nothing else may use it.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
