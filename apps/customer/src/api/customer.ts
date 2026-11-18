import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';

import { useMe } from '@/api/session';
import { invokeFunction, rpc, supabase } from '@/lib/supabase';

import { queryKeys } from './keys';
import type { Activity, Home, InAppNotification, MerchantDetail, MerchantSummary, Redemption, RedemptionCode, Reward, Wallet } from './types';

/** Rows per page in the long lists. */
export const PAGE_SIZE = 30;

export type Coords = { lat: number; lng: number } | null;

const nextOffset = <T,>(lastPage: T[], pages: T[][]) => (lastPage.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE);

// ---------------------------------------------------------------------------------------------------------------------------
// Home, wallet, activity, vouchers
// ---------------------------------------------------------------------------------------------------------------------------

export function useHome(coords: Coords) {
  const me = useMe();
  return useQuery({
    queryKey: [...queryKeys.home(me), coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => rpc<Home>('customer_home', { p_lat: coords?.lat ?? null, p_lng: coords?.lng ?? null }),
  });
}

export function useWallet() {
  const me = useMe();
  return useQuery({ queryKey: queryKeys.wallet(me), queryFn: () => rpc<Wallet>('customer_wallet') });
}

export type ActivityKind = 'earned' | 'redeemed' | null;

export function useActivity(kind: ActivityKind) {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: queryKeys.activity(me, kind),
    queryFn: ({ pageParam }) => rpc<Activity[]>('customer_activity', { p_kind: kind, p_limit: PAGE_SIZE, p_offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  });
}

/** A transaction already on screen somewhere (Home, Wallet, Activity), so its detail opens instantly. */
export function findCachedActivity(queryClient: QueryClient, me: string, id: string): Activity | undefined {
  for (const [, data] of queryClient.getQueriesData<InfiniteData<Activity[]> | Home | Activity[]>({ queryKey: ['activity', me] })) {
    const pages = data && 'pages' in data ? data.pages.flat() : [];
    const found = pages.find((item) => item.id === id);
    if (found) return found;
  }
  for (const [, data] of queryClient.getQueriesData<Home>({ queryKey: queryKeys.home(me) })) {
    const found = data?.recent_activity.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

/** One transaction: from what's cached, else the most recent 200 (customer_activity has no by-id read). */
export function useActivityItem(id: string) {
  const me = useMe();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['activity-item', me, id],
    queryFn: async () => findCachedActivity(queryClient, me, id) ?? (await rpc<Activity[]>('customer_activity', { p_kind: null, p_limit: 200, p_offset: 0 })).find((item) => item.id === id) ?? null,
    initialData: () => findCachedActivity(queryClient, me, id),
  });
}

/** History at one shop: the most recent 200 transactions, filtered on the phone (the function has no merchant filter). */
export function useMerchantActivity(merchantId: string | null) {
  const me = useMe();
  return useQuery({
    queryKey: [...queryKeys.activity(me, null), 'merchant', merchantId],
    queryFn: async () => (await rpc<Activity[]>('customer_activity', { p_kind: null, p_limit: 200, p_offset: 0 })).filter((item) => item.merchant_id === merchantId),
    enabled: !!merchantId,
  });
}

export function useRedemptions() {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: queryKeys.redemptions(me),
    queryFn: ({ pageParam }) => rpc<Redemption[]>('customer_redemptions', { p_limit: PAGE_SIZE, p_offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------------------------------------------------------

export type MerchantSort = 'name' | 'nearby' | 'favorites';
export type MerchantFilter = { search: string; category: string | null; sort: MerchantSort; coords: Coords };

export function useMerchants(filter: MerchantFilter) {
  const me = useMe();
  const sort = filter.sort === 'nearby' && !filter.coords ? 'name' : filter.sort;
  return useInfiniteQuery({
    queryKey: [...queryKeys.merchants(me), filter.search.trim(), filter.category, sort, filter.coords?.lat ?? null, filter.coords?.lng ?? null],
    queryFn: ({ pageParam }) =>
      rpc<MerchantSummary[]>('customer_merchants', {
        p_search: filter.search.trim() || null,
        p_category: filter.category,
        p_lat: filter.coords?.lat ?? null,
        p_lng: filter.coords?.lng ?? null,
        p_sort: sort,
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  });
}

export function useMerchant(id: string, coords: Coords) {
  const me = useMe();
  return useQuery({
    queryKey: [...queryKeys.merchant(me, id), coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => rpc<MerchantDetail>('customer_merchant', { p_merchant_id: id, p_lat: coords?.lat ?? null, p_lng: coords?.lng ?? null }),
  });
}

/** Adds or removes a favourite, then refreshes everything that shows the heart. */
export function useToggleFavorite() {
  const me = useMe();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ merchantId, favorite }: { merchantId: string; favorite: boolean }) => {
      const { error } = favorite
        ? await supabase.from('customer_favorites').upsert({ customer_id: me, merchant_id: merchantId }, { onConflict: 'customer_id,merchant_id', ignoreDuplicates: true })
        : await supabase.from('customer_favorites').delete().eq('customer_id', me).eq('merchant_id', merchantId);
      if (error) throw error;
    },
    onSettled: (_data, _error, { merchantId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.merchant(me, merchantId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.merchants(me) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home(me) });
    },
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------------------------------------------------------

export function useRewards(eligibleOnly: boolean, merchantId: string | null = null) {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: [...queryKeys.rewards(me), eligibleOnly, merchantId],
    queryFn: ({ pageParam }) => rpc<Reward[]>('customer_rewards', { p_merchant_id: merchantId, p_eligible_only: eligibleOnly, p_limit: PAGE_SIZE, p_offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  });
}

function findCachedReward(queryClient: QueryClient, me: string, id: string): Reward | undefined {
  for (const [, data] of queryClient.getQueriesData<InfiniteData<Reward[]>>({ queryKey: queryKeys.rewards(me) })) {
    const found = data?.pages.flat().find((reward) => reward.id === id);
    if (found) return found;
  }
  for (const [, data] of queryClient.getQueriesData<Home>({ queryKey: queryKeys.home(me) })) {
    const found = data?.featured_rewards.find((reward) => reward.id === id);
    if (found) return found;
  }
  return undefined;
}

/** One reward with the customer's balance and eligibility (always re-read: eligibility changes with every visit). */
export function useReward(id: string, merchantId: string | null) {
  const me = useMe();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['reward', me, id],
    queryFn: async () => {
      const merchant = merchantId ?? findCachedReward(queryClient, me, id)?.merchant_id ?? null;
      const list = await rpc<Reward[]>('customer_rewards', { p_merchant_id: merchant, p_eligible_only: false, p_limit: 200, p_offset: 0 });
      return list.find((reward) => reward.id === id) ?? null;
    },
    placeholderData: () => findCachedReward(queryClient, me, id),
  });
}

/** Asks for a voucher code. Nothing is deducted now: the points are taken when the cashier scans it. */
export async function requestVoucher(rewardId: string): Promise<RedemptionCode> {
  return invokeFunction<RedemptionCode>('qr-token', { action: 'redemption', rewardId });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------------------------------------------------------

const NOTIFICATION_COLUMNS = 'id, kind, title, body, data, read_at, created_at';

export function useNotifications() {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: queryKeys.notifications(me),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_COLUMNS)
        .eq('recipient_id', me)
        .eq('channel', 'in_app')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as InAppNotification[];
    },
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  });
}

/** How many in-app notifications are unread (the bell's badge). */
export function useUnreadCount() {
  const me = useMe();
  return useQuery({
    queryKey: queryKeys.unread(me),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', me)
        .eq('channel', 'in_app')
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** The newest in-app notification since `since` (the code screen watches for "You earned …" while it's open). */
export async function latestNotificationSince(me: string, since: string): Promise<InAppNotification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('recipient_id', me)
    .eq('channel', 'in_app')
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as InAppNotification | null) ?? null;
}

export function useMarkRead() {
  const me = useMe();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[] | 'all') => {
      let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', me).eq('channel', 'in_app').is('read_at', null);
      if (ids !== 'all') query = query.in('id', ids);
      const { error } = await query;
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(me) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.unread(me) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home(me) });
    },
  });
}

/** After points move (a push, the code screen's celebration), everything showing a balance re-reads. */
export function refreshBalances(queryClient: QueryClient, me: string): void {
  for (const key of [queryKeys.home(me), queryKeys.wallet(me), ['activity', me], queryKeys.redemptions(me), queryKeys.rewards(me), queryKeys.unread(me), queryKeys.notifications(me)]) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}
