import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { latestNotificationSince, refreshBalances } from '@/api/customer';
import type { InAppNotification } from '@/api/types';
import { useMe } from '@/api/session';

/** How often the open code screen checks whether the cashier has just added points. */
const POLL_MS = 4000;
const CELEBRATED_KINDS = new Set(['points_earned', 'reward_redeemed']);

/**
 * While the member code is on screen, watches for the notification the database writes when a cashier awards points or takes
 * a voucher (works without push, e.g. in the simulator or with notifications off). Returns the one to celebrate, once.
 */
export function useEarnWatch(active: boolean) {
  const me = useMe();
  const queryClient = useQueryClient();
  const since = useRef(new Date().toISOString());
  const [dismissed, setDismissed] = useState<string | null>(null);
  const refreshed = useRef<string | null>(null);

  // Only what happens from now on: reopening the screen starts a new window.
  useEffect(() => {
    if (active) since.current = new Date().toISOString();
  }, [active]);

  const latest = useQuery({
    queryKey: ['earn-watch', me],
    queryFn: () => latestNotificationSince(me, since.current),
    enabled: active,
    refetchInterval: active ? POLL_MS : false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const found: InAppNotification | null = latest.data ?? null;
  // Something happened at the counter: every balance on screen re-reads, once per notification.
  useEffect(() => {
    if (!found || refreshed.current === found.id) return;
    refreshed.current = found.id;
    refreshBalances(queryClient, me);
  }, [found, queryClient, me]);

  const celebrate = found && found.kind && CELEBRATED_KINDS.has(found.kind) && found.id !== dismissed ? found : null;
  return {
    celebrate,
    dismiss: () => {
      if (found) {
        setDismissed(found.id);
        since.current = found.created_at;
      }
    },
  };
}
