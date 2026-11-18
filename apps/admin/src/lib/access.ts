/** Who may reach what in the admin portal. Pure, so every rule is tested. */

export type Gate = { signedIn: boolean; aal: 'aal1' | 'aal2' | null };

/**
 * Where a request should be sent instead, or null to let it through. A password (aal1) is never enough: until the
 * authenticator code is verified (aal2) the only places open are the code step and sign-out. This is the first line;
 * every page and, above all, the database check permissions again.
 */
export function routeFor(gate: Gate, pathname: string): string | null {
  // Ending a bad session must always work. Without this, a session the pages reject but the proxy still accepts would loop.
  if (pathname === '/denied') return null;
  // An administrator invitation: the page shows sign-in when needed and the database checks the token and the email.
  if (/^\/join\/[^/]+$/.test(pathname)) return null;
  if (!gate.signedIn) return pathname === '/login' ? null : '/login';
  if (gate.aal !== 'aal2') return pathname === '/mfa' || pathname === '/logout' ? null : '/mfa';
  return pathname === '/login' || pathname === '/mfa' ? '/' : null;
}

/** Idle timeout for an administrator session. */
export const IDLE_LIMIT_MS = 30 * 60 * 1000;

/** The last-seen cookie lives much longer than the limit, so its absence on a signed-in request means "expired". */
/** The cookie holding the last time this browser made a request as an administrator. */
export const IDLE_COOKIE = 'ugnaya_admin_seen';

export const IDLE_COOKIE_MAX_AGE_S = 12 * 60 * 60;

/**
 * For a signed-in request: expired when the last-seen time is missing (the sign-in action sets it, so a session without
 * one was never stamped or the browser dropped it) or older than the limit.
 */
export function idleExpired(lastSeen: number | null, now: number, limit: number = IDLE_LIMIT_MS): boolean {
  return lastSeen === null || now - lastSeen > limit;
}

export function parseAllowlist(value: string | undefined): string[] {
  return (value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

const toInt = (ip: string): number | null => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    n = n * 256 + Number(part);
  }
  return n;
};

/** An empty list means no restriction. Entries are exact addresses or IPv4 ranges like 198.51.100.0/24. */
export function isIpAllowed(ip: string | null, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  if (!ip) return false;
  return allowlist.some((entry) => {
    if (!entry.includes('/')) return entry === ip;
    const [base, bitsText] = entry.split('/');
    const bits = Number(bitsText);
    const a = toInt(ip);
    const b = toInt(base);
    if (a === null || b === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    const size = 2 ** (32 - bits);
    return Math.floor(a / size) === Math.floor(b / size);
  });
}

/** The caller's address as seen by the platform's proxy: the first hop of x-forwarded-for, else x-real-ip. */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim() || null;
  return headers.get('x-real-ip')?.trim() || null;
}
