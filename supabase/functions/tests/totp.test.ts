import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { base32Encode, generateTotpSecret, totp } from '../_shared/totp.ts';

describe('totp', () => {
  it('matches the RFC 6238 vectors, as the SQL does', async () => {
    const secret = new TextEncoder().encode('12345678901234567890');
    assertEquals(await totp(secret, 1), '287082');
    assertEquals(await totp(secret, 37037036), '081804');
  });
  it('encodes base32 as RFC 4648 says', () => {
    assertEquals(base32Encode(new TextEncoder().encode('foobar')), 'MZXW6YTBOI');
  });
  it('makes 20-byte secrets (32 base32 characters)', () => {
    const secret = generateTotpSecret();
    assertEquals(secret.length, 20);
    assertEquals(base32Encode(secret).length, 32);
  });
});
