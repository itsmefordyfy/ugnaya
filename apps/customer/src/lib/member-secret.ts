import * as Device from 'expo-device';

import type { DeviceSecret } from '@/api/types';
import { invokeFunction } from '@/lib/supabase';
import { secureGet, secureRemove, secureSet } from '@/lib/secure-storage';
import { base32Decode } from '@/lib/totp';

const keyFor = (userId: string) => `ugnaya.member.${userId}`;

export type MemberSecret = { memberId: string; secret: Uint8Array };

function parse(stored: string | null): MemberSecret | null {
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<DeviceSecret>;
    const secret = typeof value.secretBase32 === 'string' ? base32Decode(value.secretBase32) : null;
    if (typeof value.memberId !== 'string' || !secret || secret.length < 10) return null;
    return { memberId: value.memberId, secret };
  } catch {
    return null;
  }
}

/**
 * This phone's member-code secret for the signed-in customer. Asked for once (qr-token `device-secret`, which records this
 * phone as one of the customer's devices) and kept in the Keychain, so the code works offline at the counter from then on.
 */
export async function loadMemberSecret(userId: string): Promise<MemberSecret> {
  const stored = parse(await secureGet(keyFor(userId)));
  if (stored) return stored;
  const issued = await invokeFunction<DeviceSecret>('qr-token', { action: 'device-secret', label: Device.modelName ?? 'Phone' });
  const parsed = parse(JSON.stringify(issued));
  if (!parsed) throw new Error('qr-token returned an unreadable secret');
  await secureSet(keyFor(userId), JSON.stringify(issued));
  return parsed;
}

export async function forgetMemberSecret(userId: string): Promise<void> {
  await secureRemove(keyFor(userId));
}
