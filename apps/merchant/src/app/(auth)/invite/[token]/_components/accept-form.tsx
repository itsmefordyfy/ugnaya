'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@ugnaya/web-ui';
import { acceptInvite, type AcceptState } from '../actions';

export function AcceptForm({ token }: { token: string }) {
  const [state, action] = useActionState<AcceptState, FormData>(acceptInvite, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage message={state.error} />
      {state.code === 'already_staff' ? (
        <Link href="/" className="link inline-flex min-h-11 items-center font-semibold">Go to your business</Link>
      ) : (
        <SubmitButton pendingLabel="Joining…">Accept and join</SubmitButton>
      )}
    </form>
  );
}
