import { safeNext } from './redirects.ts';

/**
 * What kind of account is signed in. Decided only from facts read from the database (row-level security limits
 * each query to the person's own rows), never from anything the browser sends.
 */
export type Role = 'owner' | 'staff' | 'customer' | 'unregistered';
export type AccountFacts = {
  /** Their role at a merchant, if they have one. */
  staffRole: 'owner' | 'manager' | 'cashier' | null;
  isCustomer: boolean;
};

/** Strongest first. A signed-in person with none of these has confirmed their email but not finished registering. */
export function resolveRole(facts: AccountFacts): Role {
  if (facts.staffRole === 'owner') return 'owner';
  if (facts.staffRole) return 'staff';
  if (facts.isCustomer) return 'customer';
  return 'unregistered';
}

/**
 * The other UGNAYA portal a role belongs in. Business accounts work in the merchant portal (merchant.ugnaya.com).
 * There is deliberately no admin entry: the admin portal has its own address and its own sign-in, and nothing on the
 * public site or here sends anyone to it (owner's call, 2026-11-08).
 */
export type Portals = { merchant: string };

/** Customers are the only role with a home in this app since the merchant portal split out (2026-11-07). Administrators sign in at the admin portal's own address, never here. */
export type Area = 'wallet';
const AREA_ROLE: Record<Area, Role> = { wallet: 'customer' };

/** Each area belongs to one role. Owners and staff are not let into customer screens. */
export function canEnter(area: Area, role: Role): boolean {
  return AREA_ROLE[area] === role;
}

/**
 * The path or full address where a role starts. Owners and staff (and a business account that never finished
 * registering) leave for the merchant portal, which has its own session, so they sign in there.
 */
export function destinationFor(role: Role, portals: Portals): string {
  switch (role) {
    case 'owner':
    case 'staff':
      return `${portals.merchant}/`;
    case 'customer':
      return '/wallet';
    case 'unregistered':
      return `${portals.merchant}/login?next=%2Fregister`;
  }
}

/** Where /login and /register send someone who is already signed in, or null to show the page. */
export function authPageRedirect(role: Role | null, portals: Portals): string | null {
  return role === null ? null : destinationFor(role, portals);
}

const AREA_PREFIX: [string, Area][] = [['/wallet', 'wallet']];

/** After signing in: the page they asked for if it is on this site and open to their role, otherwise their own home. */
export function signInRedirect(next: string | null, role: Role, portals: Portals): string {
  const home = destinationFor(role, portals);
  if (role !== 'customer') return home;
  const wanted = safeNext(next);
  if (!wanted) return home;
  const area = AREA_PREFIX.find(([prefix]) => wanted === prefix || wanted.startsWith(`${prefix}/`) || wanted.startsWith(`${prefix}?`));
  return area && !canEnter(area[1], role) ? home : wanted;
}

const PUBLIC_EXACT = new Set(['/login', '/register', '/forgot-password', '/logout', '/merchant', '/pos']);

/**
 * Everything else in the app needs a signed-in person. /merchant and /pos are old addresses that now only redirect to
 * the merchant portal, so a visitor goes there directly.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || pathname === '/auth' || pathname.startsWith('/auth/');
}
