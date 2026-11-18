'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@ugnaya/web-ui';
import { acceptInvite, type JoinState } from './actions';

export type AcceptFormProps = { token: string };

export function AcceptForm({ token }: AcceptFormProps) {
  const [state, action] = useActionState<JoinState, FormData>(acceptInvite, {});
  return (
    <form action={action} className="space-y-4">
      <FormMessage message={state.error} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingLabel="Accepting…">Accept and set up my authenticator</SubmitButton>
    </form>
  );
}
