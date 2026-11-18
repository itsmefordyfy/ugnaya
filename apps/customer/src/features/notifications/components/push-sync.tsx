import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { refreshBalances } from '@/api/customer';
import { useMe } from '@/api/session';

import { registerIfAllowed } from '@/lib/push';

/** Where a tapped notification leads: the transaction, the shop, or the list. */
function openFrom(data: Record<string, unknown> | undefined): void {
  if (typeof data?.transaction_id === 'string') router.push({ pathname: '/activity/[id]', params: { id: data.transaction_id } });
  else if (typeof data?.merchant_id === 'string') router.push({ pathname: '/merchant/[id]', params: { id: data.merchant_id } });
  else router.push('/notifications');
}

/**
 * While the customer is in the app: keeps this phone registered for push (only if they already allowed notifications; the
 * app asks on Home, after saying why), refreshes balances when a push arrives, and opens what a tapped push is about.
 */
export function PushSync() {
  const me = useMe();
  const queryClient = useQueryClient();

  useEffect(() => {
    void registerIfAllowed().catch(() => {});
  }, [me]);

  // A push tapped while the app was closed opens what it's about once the app is in.
  const last = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!last || handled.current === last.notification.request.identifier) return;
    handled.current = last.notification.request.identifier;
    openFrom(last.notification.request.content.data);
  }, [last]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => refreshBalances(queryClient, me));
    return () => received.remove();
  }, [queryClient, me]);

  return null;
}
