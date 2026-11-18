'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import { TextAreaField } from '@/components/fields';
import type { ActionState } from '@/lib/action-state';
import { respondToReview } from '../actions';

/** The reply to “more information required”: it goes to the UGNAYA reviewer and the application returns to review. */
export function ReplyForm() {
  const [state, action] = useActionState<ActionState, FormData>(respondToReview, {});
  useActionToast(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state.ok === false && !state.fieldErrors ? state.error : undefined} />
      <TextAreaField name="message" label="Your reply" rows={5} maxLength={2000} required
        hint="Say what you changed or uploaded. Upload any requested documents above before you reply."
        error={state.fieldErrors?.message} />
      <SubmitButton pendingLabel="Sending…" className="sm:w-auto">Send reply to UGNAYA</SubmitButton>
    </form>
  );
}
