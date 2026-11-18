/**
 * React Query keys for server reads, in one place, so a change knows what to refresh. Every key starts with the signed-in
 * customer's id (`me`), so one person's cached data can never show for the next one on the same phone.
 */
export const queryKeys = {
  profile: (me: string) => ['profile', me] as const,
  home: (me: string) => ['home', me] as const,
  wallet: (me: string) => ['wallet', me] as const,
  activity: (me: string, kind: 'earned' | 'redeemed' | null) => ['activity', me, kind] as const,
  redemptions: (me: string) => ['redemptions', me] as const,
  merchants: (me: string) => ['merchants', me] as const,
  merchant: (me: string, id: string) => ['merchant', me, id] as const,
  rewards: (me: string) => ['rewards', me] as const,
  notifications: (me: string) => ['notifications', me] as const,
  unread: (me: string) => ['unread', me] as const,
  memberSecret: (me: string) => ['member-secret', me] as const,
};
