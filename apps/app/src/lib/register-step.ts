export type RegisterStep = 'account' | 'check-email' | 'done';

/**
 * Which part of /register to show. Registration here is for customers only; a signed-in person is already
 * registered (and is sent on by role before this is asked). Businesses register in the merchant portal.
 */
export function registerStep(input: { user: { id: string } | null; justSignedUp: boolean }): RegisterStep {
  if (input.user) return 'done';
  return input.justSignedUp ? 'check-email' : 'account';
}
