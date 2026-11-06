export type RegisterStep = 'account' | 'check-email' | 'business' | 'done';

/**
 * Which part of /register to show. A signed-in user is always email-confirmed (Supabase gives no
 * session before confirmation), so a returning owner who closed the tab lands on the business step.
 */
export function registerStep(input: { user: { id: string } | null; hasMerchant: boolean; justSignedUp: boolean }): RegisterStep {
  if (input.user) return input.hasMerchant ? 'done' : 'business';
  return input.justSignedUp ? 'check-email' : 'account';
}
