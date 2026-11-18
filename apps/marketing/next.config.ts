import path from 'node:path';
import type { NextConfig } from 'next';
// The config runs in plain Node, so it imports the one pure helper it needs, not the package's component barrel.
import { siteUrls } from '../../packages/web-ui/src/lib/urls.ts';

const urls = siteUrls({
  development: process.env.NODE_ENV !== 'production',
  marketing: process.env.NEXT_PUBLIC_MARKETING_URL,
  app: process.env.NEXT_PUBLIC_APP_URL,
  admin: process.env.NEXT_PUBLIC_ADMIN_URL,
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The shared packages ship TypeScript source.
  // 90 is used for Ugi (soft transparent edges); 75 is Next's default for everything else.
  images: { qualities: [75, 90] },
  transpilePackages: ['@ugnaya/ui-tokens', '@ugnaya/brand', '@ugnaya/web-ui', '@ugnaya/rules', '@ugnaya/db'],
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
  // The product lives on app.ugnaya.com. Old links to sign-in, registration and the signed-in area on this
  // domain keep working: Next passes the query string (type, next, utm_*) through to the destination.
  async redirects() {
    return [
      { source: '/login', destination: `${urls.app}/login`, permanent: true },
      { source: '/register', destination: `${urls.app}/register`, permanent: true },
      { source: '/app/:path*', destination: `${urls.app}/`, permanent: true },
      { source: '/auth/:path*', destination: `${urls.app}/auth/:path*`, permanent: true },
    ];
  },
};

export default nextConfig;
