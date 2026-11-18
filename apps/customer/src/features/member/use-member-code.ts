import { useQuery } from '@tanstack/react-query';
import { formatMemberCode } from '@ugnaya/rules';
import { useEffect, useState } from 'react';

import { queryKeys } from '@/api/keys';
import { useMe } from '@/api/session';
import { totpAt } from '@/lib/totp';

import { loadMemberSecret } from '@/lib/member-secret';

/** The secret, read once per sign-in (Keychain first, then the Edge Function). */
export function useMemberSecret() {
  const me = useMe();
  return useQuery({
    queryKey: queryKeys.memberSecret(me),
    queryFn: () => loadMemberSecret(me),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/** The current second, ticking while `active` (the code tab in front). */
function useClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    // At once (back on the tab, the last code shown may be stale), then on each whole second, so the countdown moves with the clock.
    const now = setTimeout(() => setNow(Date.now()), 0);
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setNow(Date.now());
      interval = setInterval(() => setNow(Date.now()), 1000);
    }, 1000 - (Date.now() % 1000));
    return () => {
      clearTimeout(now);
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [active]);
  return now;
}

/** The member code to show (`U:<member id>:<6 digits>`), refreshing every 30 seconds, with the seconds it has left. */
export function useMemberCode(active: boolean) {
  const secret = useMemberSecret();
  const now = useClock(active);
  const value = secret.data ? totpAt(secret.data.secret, now) : null;
  return {
    secret,
    memberId: secret.data?.memberId ?? null,
    digits: value?.code ?? null,
    payload: secret.data && value ? formatMemberCode(secret.data.memberId, value.code) : null,
    secondsLeft: value?.secondsLeft ?? 0,
  };
}
