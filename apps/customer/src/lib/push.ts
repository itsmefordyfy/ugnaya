import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { rpc, supabase } from '@/lib/supabase';
import { secureGet, secureRemove, secureSet } from '@/lib/secure-storage';

const TOKEN_KEY = 'ugnaya.pushToken';

/** Shows a push that arrives while the app is open as a banner (the in-app list refreshes too). */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** The EAS project id the Expo push service needs; absent until the owner runs `eas init` (IOS_COMPLETION_TRACKER.md). */
export function pushProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined;
  const id = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export type PushSetup = 'registered' | 'denied' | 'undetermined' | 'unsupported' | 'not_configured';

/**
 * Registers this phone for push for the signed-in customer, if they allowed notifications: the Expo push token goes to
 * `register_push_token` (the backend's push-dispatch function sends with it). Never asks for permission itself; `askAndRegister`
 * does, after the app has said why.
 */
export async function registerIfAllowed(): Promise<PushSetup> {
  if (!Device.isDevice) return 'unsupported';
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return permission.canAskAgain ? 'undetermined' : 'denied';
  const projectId = pushProjectId();
  if (!projectId) return 'not_configured';
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await rpc<null>('register_push_token', { p_token: token, p_platform: process.env.EXPO_OS === 'android' ? 'android' : 'ios' });
  await secureSet(TOKEN_KEY, token);
  return 'registered';
}

export async function askAndRegister(): Promise<PushSetup> {
  if (!Device.isDevice) return 'unsupported';
  const result = await Notifications.requestPermissionsAsync();
  if (result.status !== 'granted') return result.canAskAgain ? 'undetermined' : 'denied';
  return registerIfAllowed();
}

/** On sign-out: this phone's token stops pointing at the person who signed out. */
export async function forgetPushToken(): Promise<void> {
  const token = await secureGet(TOKEN_KEY);
  if (!token) return;
  await supabase.from('push_tokens').delete().eq('token', token);
  await secureRemove(TOKEN_KEY);
}
