/**
 * What the cashier scans. A member code is `U:<member id>:<code>`: the code is a 6-digit TOTP from
 * the customer app, or `W` plus a short-lived random code from the web wallet. A redemption code is
 * `R:<token>`, the one-time token for one reward.
 */
const MEMBER_ID = /^[A-HJ-NP-Z2-9]{8}$/;
const TOTP = /^\d{6}$/;
const WEB_CODE = /^W[A-Za-z0-9_-]{10,64}$/;
const TOKEN = /^[0-9a-f]{8,128}$/;

export function formatMemberCode(memberId: string, code: string): string {
  return `U:${memberId}:${code}`;
}

export function parseMemberCode(scanned: string): { memberId: string; code: string } | null {
  const parts = scanned.trim().split(':');
  if (parts.length !== 3 || parts[0] !== 'U') return null;
  const [, memberId, code] = parts;
  if (!MEMBER_ID.test(memberId) || !(TOTP.test(code) || WEB_CODE.test(code))) return null;
  return { memberId, code };
}

export function formatRedemptionCode(token: string): string {
  return `R:${token}`;
}

export function parseRedemptionCode(scanned: string): { token: string } | null {
  const match = /^R:(.+)$/.exec(scanned.trim());
  if (!match || !TOKEN.test(match[1])) return null;
  return { token: match[1] };
}
