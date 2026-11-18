import { APP_LINKS, urls } from './urls';

/** This site's own origin, from the environment (lib/urls.ts). */
export const SITE_URL = urls.marketing;
export const SITE_NAME = 'UGNAYA';
export const TAGLINE = 'One Wallet. More Places. More Rewards.';
export const TAGLINE_FIL = 'Isang wallet. Mas maraming lugar. Mas maraming rewards.';
/** Public contact address; to confirm with the owner (CLAUDE.md, open questions). */
export const CONTACT_EMAIL = 'hello@ugnaya.com';
export const DESCRIPTION =
  'A digital loyalty card for your café, milk tea shop or restaurant, and customers from the shops around you.';

export const NAV: { label: string; href: string }[] = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'For customers', href: '/for-customers' },
  { label: 'For businesses', href: '/for-businesses' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

/** Everything that needs an account sends the visitor to the app, keeping what they came for. */
export const CTA_MERCHANT = { label: 'Register your business', href: APP_LINKS.registerMerchant };
export const CTA_GET_STARTED = { label: 'Get started', href: APP_LINKS.getStarted };
export const CTA_SIGN_IN = { label: 'Sign in', href: APP_LINKS.signIn };
export const CTA_CUSTOMER_ACCOUNT = { label: 'Create your account', href: APP_LINKS.registerCustomer };
export const CTA_CUSTOMER = { label: 'Join the waitlist', href: '/for-customers#waitlist' };
