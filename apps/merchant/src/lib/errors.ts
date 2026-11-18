/**
 * The database answers with short codes (raise_code in the migrations); these are the sentences people read.
 * Counter codes say what to do next, because a cashier reads them with a customer waiting.
 */
const MESSAGES: Record<string, string> = {
  // Access
  forbidden: 'Your role can’t do that. Ask the owner.',
  use_invite: 'People with a UGNAYA login join through an invitation they accept themselves. Use “Invite staff”.',
  branch_out_of_scope: 'You manage only your own branches. Choose branches you look after, or ask the owner.',
  email_unconfirmed: 'Confirm your email address first, then open the invitation again.',
  identity_locked: 'Your business name is fixed once UGNAYA has reviewed it. Email us to change it.',
  logo_invalid: 'That logo file isn’t valid. Upload it again.',
  sign_in_required: 'Your session ended. Sign in again.',
  permission_denied: 'Your role can’t do that. Ask the owner.',
  // Application and documents
  application_locked: 'The application is with UGNAYA now, so documents can’t be changed. If we need more, we’ll ask here.',
  documents_required: 'Upload at least one document before you send the application.',
  invalid_transition: 'That step isn’t available any more. Refresh the page to see the latest status.',
  file_type: 'Use a PDF, JPEG, PNG or WebP file.',
  file_missing: 'The upload didn’t finish. Choose the file again.',
  file_too_large: 'That file is over 10 MB. Use a smaller scan or photo.',
  too_many_documents: 'You’ve reached 20 documents. Remove one first.',
  not_found: 'That item no longer exists. Refresh the page.',
  message_required: 'Write a short reply first.',
  message_too_long: 'Keep the reply under 2,000 characters.',
  already_registered: 'This account already has a business.',
  // Staff
  name_invalid: 'Enter a name of 1 to 80 characters.',
  email_invalid: 'Enter a valid email address.',
  user_not_found: 'There’s no UGNAYA account with that email. Send an invitation instead.',
  already_staff: 'That person is already on your staff.',
  login_required: 'A manager needs their own sign-in. Send them an invitation.',
  pin_required: 'A cashier without a sign-in needs a PIN of 4 to 6 digits.',
  pin_invalid: 'A PIN is 4 to 6 digits.',
  pin_taken: 'Another staff member uses that PIN. Choose a different one.',
  branch_invalid: 'One of those branches isn’t part of this business.',
  cannot_change_self: 'You can’t change your own role or turn yourself off. Ask the owner.',
  merchant_not_approved: 'Staff invitations open once UGNAYA approves your business.',
  invite_closed: 'That invitation was already accepted or cancelled.',
  invite_invalid: 'This invitation link has expired, was cancelled or was already used. Ask for a new one.',
  invite_wrong_account: 'This invitation is for a different email address. Sign out and sign in with the invited email.',
  // Counter
  merchant_inactive: 'The counter opens once UGNAYA approves the business and the loyalty program is on.',
  staff_not_allowed: 'You’re not set up to work at this branch. Choose your branch or ask the owner.',
  device_not_allowed: 'This device isn’t registered for the counter.',
  device_locked: 'This device is locked for a few minutes after too many wrong PINs.',
  request_invalid: 'Something was missing from that request. Please try again.',
  amount_invalid: 'Enter the amount spent in pesos (more than zero and within the per-purchase limit).',
  receipt_duplicate: 'That receipt number was already used for points. Check the receipt.',
  daily_limit: 'This customer has reached today’s limit for earning here. They can earn again tomorrow.',
  customer_unknown: 'That member account isn’t active. Ask the customer to check their UGNAYA app.',
  invalid_member_code: 'That member code isn’t valid or has expired. Ask the customer to refresh their QR code and scan again.',
  token_invalid: 'That voucher code isn’t valid for this shop. Check the code and try again.',
  token_expired: 'That voucher has expired. Ask the customer to claim the reward again in their app.',
  token_used: 'That voucher was already used. It can’t be redeemed twice.',
  insufficient_points: 'The customer doesn’t have enough points for this reward any more.',
  reward_unavailable: 'That reward isn’t available right now (turned off or out of stock).',
  monthly_cap: 'This reward has reached its monthly limit. It opens again next month.',
  first_visit_only: 'This reward is only for a customer’s first visit.',
  // Rewards and campaigns (row-level security refusals)
  row_level_security: 'Your role can’t change that, or the business isn’t approved yet.',
  invalid_range: 'The end must be after the start.',
};

const FALLBACK = 'Something went wrong. Please try again.';

/** A person-readable sentence for an error from Supabase (a raise_code message, an RLS refusal, or anything else). */
export function friendlyError(error: { message?: string; code?: string } | string | null | undefined): string {
  if (!error) return FALLBACK;
  const message = typeof error === 'string' ? error : (error.message ?? '');
  const code = typeof error === 'string' ? undefined : error.code;
  if (MESSAGES[message]) return MESSAGES[message];
  if (code === '42501' || message.startsWith('permission denied')) return MESSAGES.permission_denied;
  if (message.includes('row-level security')) return MESSAGES.row_level_security;
  if (code === 'PGRST202' || message.includes('Could not find the function')) {
    return 'This feature isn’t switched on yet on the server. Please try again later.';
  }
  return FALLBACK;
}

/** True when the error is a known code (so callers can show it next to a field rather than as a page error). */
export const isKnownError = (message: string | undefined): boolean => Boolean(message && MESSAGES[message]);
