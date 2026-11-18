/**
 * The member code's one-time number, made on the phone (RFC 6238 TOTP: HMAC-SHA-1, 6 digits, a 30-second step), from the secret
 * the qr-token Edge Function issued for this phone. The server (verify_member_code) accepts the current step and one step of
 * drift. Pure and dependency-free: Hermes has no WebCrypto HMAC, and the code must keep working offline at the counter.
 */

export const TOTP_STEP_SECONDS = 30;
const DIGITS = 6;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 (no padding, case-insensitive) to bytes; null for anything else. */
export function base32Decode(text: string): Uint8Array | null {
  const clean = text.replace(/=+$/, '').toUpperCase();
  if (!/^[A-Z2-7]+$/.test(clean)) return null;
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));

/** SHA-1 of bytes (FIPS 180-4). */
export function sha1(message: Uint8Array): Uint8Array {
  const length = message.length;
  const padded = new Uint8Array((((length + 8) >> 6) + 1) * 64);
  padded.set(message);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  // The length in bits, as a 64-bit big-endian number (messages here are far below 2^32 bits).
  view.setUint32(padded.length - 4, length * 8);
  view.setUint32(padded.length - 8, Math.floor((length * 8) / 2 ** 32));

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(block + i * 4);
    for (let i = 16; i < 80; i += 1) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i += 1) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30) >>> 0;
      b = a;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => outView.setUint32(i * 4, h));
  return out;
}

/** HMAC-SHA-1 (RFC 2104). */
export function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const block = 64;
  const keyBlock = new Uint8Array(block);
  keyBlock.set(key.length > block ? sha1(key) : key);
  const inner = new Uint8Array(block + message.length);
  const outer = new Uint8Array(block + 20);
  for (let i = 0; i < block; i += 1) {
    inner[i] = keyBlock[i] ^ 0x36;
    outer[i] = keyBlock[i] ^ 0x5c;
  }
  inner.set(message, block);
  outer.set(sha1(inner), block);
  return sha1(outer);
}

/** The HOTP value for one counter (RFC 4226), `digits` long with leading zeros. */
export function hotp(secret: Uint8Array, counter: number, digits = DIGITS): string {
  const message = new Uint8Array(8);
  const view = new DataView(message.buffer);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const mac = hmacSha1(secret, message);
  const offset = mac[19] & 0x0f;
  const code = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(code % 10 ** digits).padStart(digits, '0');
}

/** The current step's code and how many seconds it has left, for a time in milliseconds. */
export function totpAt(secret: Uint8Array, nowMs: number): { code: string; secondsLeft: number; step: number } {
  const seconds = Math.floor(nowMs / 1000);
  const step = Math.floor(seconds / TOTP_STEP_SECONDS);
  return { code: hotp(secret, step), secondsLeft: TOTP_STEP_SECONDS - (seconds % TOTP_STEP_SECONDS), step };
}
