import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerMerchantCore, type RegisterArgs } from './register-merchant.ts';
import type { RegisterInput } from './validation.ts';

const INPUT: RegisterInput = {
  tradeName: 'Kape ni Juan', category: 'cafe', city: 'Naga City', address: 'Magsaysay Ave', branchCount: 1,
  ownerMobile: '+639171234567', heardFrom: 'visit', acceptTerms: true, marketingConsent: false,
};
const rpcAnswering = (message: string | null) => {
  const calls: RegisterArgs[] = [];
  const rpc = async (args: RegisterArgs) => {
    calls.push(args);
    return { error: message ? { message } : null };
  };
  return { rpc, calls };
};

test('a new business goes to its application with a welcome, and the arguments match register_merchant', async () => {
  const { rpc, calls } = rpcAnswering(null);
  assert.deepEqual(await registerMerchantCore(rpc, INPUT), { redirect: '/application?welcome=1' });
  assert.deepEqual(calls[0], {
    p_trade_name: 'Kape ni Juan', p_category: 'cafe', p_city: 'Naga City', p_address: 'Magsaysay Ave',
    p_branch_count: 1, p_owner_mobile: '+639171234567', p_heard_from: 'visit', p_marketing_consent: false,
  });
});
test('a second submit (double tap, back button) lands in the portal, not an error', async () => {
  assert.deepEqual(await registerMerchantCore(rpcAnswering('already_registered').rpc, INPUT), { redirect: '/' });
});
test('no session: sign in first', async () => {
  assert.deepEqual(await registerMerchantCore(rpcAnswering('sign_in_required').rpc, INPUT), { redirect: '/login?next=%2Fregister' });
  assert.deepEqual(await registerMerchantCore(rpcAnswering('permission denied for function register_merchant').rpc, INPUT),
    { redirect: '/login?next=%2Fregister' });
});
test('anything else is a message, not a crash', async () => {
  const result = await registerMerchantCore(rpcAnswering('boom').rpc, INPUT);
  assert.ok('formError' in result);
});
