import type { Database } from '@ugnaya/db';
import type { RegisterInput } from './validation.ts';

export type RegisterArgs = Database['public']['Functions']['register_merchant']['Args'];
export type RegisterRpc = (args: RegisterArgs) => PromiseLike<{ error: { message: string } | null }>;
export type RegisterOutcome = { redirect: string } | { formError: string };

/** Calls register_merchant and decides where the owner goes next. Pure apart from the rpc it's given. */
export async function registerMerchantCore(rpc: RegisterRpc, input: RegisterInput): Promise<RegisterOutcome> {
  const { error } = await rpc({
    p_trade_name: input.tradeName,
    p_category: input.category,
    p_city: input.city,
    p_address: input.address,
    p_branch_count: input.branchCount,
    p_owner_mobile: input.ownerMobile,
    p_heard_from: input.heardFrom,
    p_marketing_consent: input.marketingConsent,
  });
  if (!error) return { redirect: '/app?welcome=1' };
  // Submitted twice (double tap, back button): the business already exists, so just go there.
  if (error.message === 'already_registered') return { redirect: '/app' };
  if (error.message === 'sign_in_required' || error.message.startsWith('permission denied')) {
    return { redirect: '/login?next=/register' };
  }
  return { formError: 'Something went wrong saving your business. Please try again.' };
}
