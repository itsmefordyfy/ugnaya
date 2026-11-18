import path from 'node:path';
import type { NextConfig } from 'next';

// Every admin page is per-user and private, so it is rendered per request (no Cache Components): that is also what
// lets the Content-Security-Policy carry a fresh nonce on each response (proxy.ts).
const nextConfig: NextConfig = {
  transpilePackages: ['@ugnaya/ui-tokens', '@ugnaya/brand', '@ugnaya/web-ui', '@ugnaya/rules', '@ugnaya/db'],
  turbopack: {
    root: path.resolve(import.meta.dirname, '../..'),
    rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
