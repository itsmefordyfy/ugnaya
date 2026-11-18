/**
 * The backend answers with short codes (`raise_code` in SQL, `{ error }` from Edge Functions). This turns any thrown value into
 * one, and a code into words a customer understands. Unknown codes fall back to a calm general line; the raw code is never shown.
 */

export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'AppError';
  }
}

const NETWORK = /network request failed|failed to fetch|fetch failed|load failed|timed? ?out|offline|internet connection/i;

/** The short code in an error from supabase-js, an Edge Function or the network. */
export function errorCode(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown; name?: unknown };
    const message = typeof record.message === 'string' ? record.message : '';
    if (record.name === 'FunctionsFetchError' || NETWORK.test(message)) return 'network';
    if (record.code === 'PGRST202' || /could not find the function/i.test(message)) return 'function_missing';
    // Postgres raise_code(): the message is the code itself.
    if (/^[a-z][a-z0-9_]{2,40}$/.test(message)) return message;
    if (typeof record.code === 'string' && /^[a-z][a-z0-9_]{2,40}$/.test(record.code)) return record.code;
  }
  return 'unknown';
}

const MESSAGES: Record<string, string> = {
  network: 'You seem to be offline. Check your connection and try again.',
  function_missing: 'This part of UGNAYA is being updated. Please try again in a little while.',
  customer_unknown: 'This sign-in isn’t a customer account. Sign in with your UGNAYA customer account.',
  sign_in_required: 'Please sign in again to continue.',
  merchant_not_found: 'This shop isn’t on UGNAYA right now.',
  insufficient_points: 'You don’t have enough points for this reward yet.',
  reward_unavailable: 'This reward isn’t available any more.',
  monthly_cap: 'You’ve reached this reward’s limit for the month.',
  first_visit_only: 'This reward is for a first visit only.',
  token_invalid: 'That code isn’t valid. Make sure you scan the code shown in the app.',
  staff_account: 'This account also manages a business. Hand the business over to another owner before deleting it.',
  token_expired: 'This code has expired.',
  request_invalid: 'Something in the request wasn’t right. Please try again.',
  rate_limited: 'Too many tries. Wait a minute and try again.',
  // Supabase Auth
  invalid_credentials: 'That email and password don’t match. Check them and try again.',
  email_not_confirmed: 'Confirm your email first: open the link we sent you, then sign in.',
  user_already_exists: 'There’s already an account with this email. Sign in instead.',
  email_exists: 'There’s already an account with this email. Sign in instead.',
  weak_password: 'Choose a stronger password: at least 8 characters, not a common one.',
  same_password: 'Your new password must be different from the current one.',
  over_email_send_rate_limit: 'Too many emails were sent. Wait a few minutes and try again.',
  over_request_rate_limit: 'Too many tries. Wait a minute and try again.',
  user_banned: 'This account can’t sign in.',
  validation_failed: 'Check the email address and try again.',
  email_address_invalid: 'Check the email address and try again.',
  session_not_found: 'Your session ended. Please sign in again.',
  otp_expired: 'This link has expired. Ask for a new one.',
  wrong_password: 'That isn’t your current password.',
};

export const GENERAL_ERROR = 'Something went wrong. Please try again.';

export function errorMessage(error: unknown): string {
  return MESSAGES[errorCode(error)] ?? GENERAL_ERROR;
}
