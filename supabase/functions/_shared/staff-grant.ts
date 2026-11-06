/**
 * A staff grant: proof, for 12 hours, that a cashier unlocked this device with their PIN. Signed with
 * HMAC-SHA256 by staff-unlock; award, redeem and void check it and that it names the calling device.
 */
export type StaffGrant = {
  staffId: string;
  deviceId: string;
  merchantId: string;
  branchId: string;
  role: 'owner' | 'manager' | 'cashier';
  /** Expiry, seconds since the epoch. */
  exp: number;
};

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function key(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signStaffGrant(grant: StaffGrant, secret: string): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify(grant)));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload)));
  return `${payload}.${base64url(signature)}`;
}

export async function verifyStaffGrant(token: string, secret: string, now = Date.now()): Promise<StaffGrant | null> {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  try {
    const valid = await crypto.subtle.verify('HMAC', await key(secret), fromBase64url(signature), encoder.encode(payload));
    if (!valid) return null;
    const grant = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as StaffGrant;
    if (typeof grant.exp !== 'number' || grant.exp * 1000 <= now) return null;
    return grant;
  } catch {
    return null;
  }
}
