import { siteUrls } from '@ugnaya/web-ui';

/**
 * The three UGNAYA origins, from the environment (`.env.example`). Written out literally so Next inlines the
 * values into browser bundles too. Never write a domain name anywhere else in this app.
 */
export const urls = siteUrls({
  development: process.env.NODE_ENV !== 'production',
  marketing: process.env.NEXT_PUBLIC_MARKETING_URL,
  app: process.env.NEXT_PUBLIC_APP_URL,
  merchant: process.env.NEXT_PUBLIC_MERCHANT_URL,
  admin: process.env.NEXT_PUBLIC_ADMIN_URL,
});
