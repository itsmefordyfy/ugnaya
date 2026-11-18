'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog, FormMessage, Icon, buttonClasses, useToast } from '@ugnaya/web-ui';
import { submitApplication } from '../actions';

/** The owner's "Send application" button: asks once, then moves the draft to pending review. */
export function SubmitApplication({ documentCount, tradeName }: { documentCount: number; tradeName: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const ready = documentCount > 0;

  function send() {
    start(async () => {
      const result = await submitApplication();
      if (result.ok) toast.show({ tone: 'success', title: result.message ?? 'Application sent' });
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <FormMessage message={error} />
      <button type="button" disabled={!ready || pending} onClick={() => setOpen(true)} className={`${buttonClasses('primary', 'lg')} disabled:opacity-60`}>
        <Icon name="send" size={20} />{pending ? 'Sending…' : 'Send application for review'}
      </button>
      {!ready && <p className="text-sm text-ink-muted">Upload at least one document first.</p>}
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={send}
        title="Send your application?"
        description={`UGNAYA will review ${tradeName} with the ${documentCount} document${documentCount === 1 ? '' : 's'} you uploaded. You can still add documents while it waits in the queue.`}
        confirmLabel="Send application"
      />
    </div>
  );
}
