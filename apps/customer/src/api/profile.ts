import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/keys';
import type { CustomerProfile } from '@/api/types';
import { useMe } from '@/api/session';
import { supabase } from '@/lib/supabase';

const COLUMNS =
  'user_id, public_member_id, display_name, birthday_month, birthday_day, city, terms_accepted_at, marketing_consent_at, notify_points, notify_offers, notify_expiry, onboarded_at, deleted_at';

export async function fetchProfile(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase.from('customer_profiles').select(COLUMNS).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data as CustomerProfile | null) ?? null;
}

/** The signed-in customer's own profile (null: this login has no customer profile, e.g. a business account). */
export function useProfileFor(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? 'none'),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useProfile() {
  return useProfileFor(useMe());
}

export type ProfileChanges = Partial<
  Pick<CustomerProfile, 'display_name' | 'birthday_month' | 'birthday_day' | 'city' | 'terms_accepted_at' | 'marketing_consent_at' | 'notify_points' | 'notify_offers' | 'notify_expiry' | 'onboarded_at'>
>;

export async function updateProfile(userId: string, changes: ProfileChanges): Promise<CustomerProfile> {
  const { data, error } = await supabase.from('customer_profiles').update(changes).eq('user_id', userId).select(COLUMNS).single();
  if (error) throw error;
  return data as CustomerProfile;
}

/** Saves profile fields; the cached profile takes the server's answer, and Home re-reads (it shows the name). */
export function useUpdateProfile() {
  const me = useMe();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: ProfileChanges) => updateProfile(me, changes),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(me), profile);
      void queryClient.invalidateQueries({ queryKey: queryKeys.home(me) });
    },
  });
}
