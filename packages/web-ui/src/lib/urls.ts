/**
 * Where each UGNAYA app lives. One place, read from the environment, so no domain is hard-coded in a page:
 * the marketing site (ugnaya.com), the customer app (app.ugnaya.com),
 * the merchant portal (merchant.ugnaya.com) and the admin portal (admin.ugnaya.com).
 *
 * Pass the values from `process.env.NEXT_PUBLIC_*` written out literally in the calling app (Next only inlines
 * literal references into browser bundles). Staging sets the same variables to its own origins.
 */
export type SiteUrls = { marketing: string; app: string; merchant: string; admin: string };

export type SiteUrlsInput = {
  /** true while developing: the apps run on ports 3000 (marketing), 3001 (app), 3002 (admin) and 3003 (merchant). */
  development: boolean;
  marketing?: string;
  app?: string;
  merchant?: string;
  admin?: string;
};

const PRODUCTION: SiteUrls = {
  marketing: 'https://ugnaya.com',
  app: 'https://app.ugnaya.com',
  merchant: 'https://merchant.ugnaya.com',
  admin: 'https://admin.ugnaya.com',
};
const DEVELOPMENT: SiteUrls = {
  marketing: 'http://localhost:3000',
  app: 'http://localhost:3001',
  merchant: 'http://localhost:3003',
  admin: 'http://localhost:3002',
};

function origin(name: keyof SiteUrls, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`The ${name} URL "${value}" is not a valid URL.`);
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.pathname.replace(/\/+$/, '') !== '' || url.search || url.hash) {
    throw new Error(`The ${name} URL must be a plain http(s) origin like https://example.com (got "${value}").`);
  }
  return url.origin;
}

export function siteUrls(input: SiteUrlsInput): SiteUrls {
  const defaults = input.development ? DEVELOPMENT : PRODUCTION;
  const pick = (name: keyof SiteUrls) => origin(name, input[name] || defaults[name]);
  return { marketing: pick('marketing'), app: pick('app'), merchant: pick('merchant'), admin: pick('admin') };
}

/** A link into another app: `hrefTo(urls.app, '/register', { type: 'merchant' })`. Empty parameters are left out. */
export function hrefTo(base: string, path: string, params: Record<string, string | undefined> = {}): string {
  if (!path.startsWith('/')) throw new Error(`A path must start with "/" (got "${path}").`);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const qs = query.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}
