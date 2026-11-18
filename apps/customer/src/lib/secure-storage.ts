import * as SecureStore from 'expo-secure-store';

/**
 * Small secrets in the iPhone's Keychain (Android's keystore): the sign-in session and this phone's member-code secret. Kept on
 * this device only (`…THIS_DEVICE_ONLY`: never moved to another phone by a backup) and readable after the first unlock, so the
 * session can refresh while the phone is locked in a pocket.
 *
 * A Supabase session is a few kilobytes and a Keychain item is happiest small (Android warns above 2 KB), so long values are
 * split into numbered chunks with a count under the key itself.
 */
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const CHUNK = 1800;

/** Keychain keys allow letters, digits, ".", "-" and "_" only. */
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');
const countKey = (key: string) => `${safeKey(key)}.chunks`;
const chunkKey = (key: string, index: number) => `${safeKey(key)}.${index}`;

export async function secureGet(key: string): Promise<string | null> {
  const count = Number(await SecureStore.getItemAsync(countKey(key), OPTIONS));
  if (!count) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i), OPTIONS);
    // A missing chunk means a write was cut short: treat the value as absent rather than hand back half of it.
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

export async function secureSet(key: string, value: string): Promise<void> {
  const previous = Number(await SecureStore.getItemAsync(countKey(key), OPTIONS)) || 0;
  const count = Math.max(1, Math.ceil(value.length / CHUNK));
  for (let i = 0; i < count; i += 1) await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK), OPTIONS);
  await SecureStore.setItemAsync(countKey(key), String(count), OPTIONS);
  for (let i = count; i < previous; i += 1) await SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS);
}

export async function secureRemove(key: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(countKey(key), OPTIONS)) || 0;
  await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
  for (let i = 0; i < count; i += 1) await SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS);
}

/** The storage interface supabase-js expects. */
export const secureAuthStorage = {
  getItem: secureGet,
  setItem: secureSet,
  removeItem: secureRemove,
};
