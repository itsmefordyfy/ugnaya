'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog, useToast } from '@ugnaya/web-ui';
import { revokeInvite } from '../actions';

export function RevokeInviteButton({ inviteId, email }: { inviteId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  function confirm() {
    start(async () => {
      const result = await revokeInvite(inviteId);
      toast.show(result.ok ? { tone: 'success', title: result.message ?? 'Invitation cancelled' } : { tone: 'error', title: result.error ?? 'Couldn’t cancel the invitation' });
    });
  }
  return (
    <>
      <button type="button" disabled={pending} onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-pill px-3 text-sm font-semibold text-danger-text hover:bg-danger-soft disabled:opacity-60">
        {pending ? 'Cancelling…' : 'Cancel'}
      </button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={confirm} danger
        title="Cancel this invitation?" description={`The link sent to ${email} will stop working.`}
        confirmLabel="Cancel invitation" cancelLabel="Keep it" />
    </>
  );
}
