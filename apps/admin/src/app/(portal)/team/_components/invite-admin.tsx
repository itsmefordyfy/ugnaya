'use client';

import { useState } from 'react';
import { Dialog, FormMessage, Icon, SubmitButton, buttonClasses } from '@ugnaya/web-ui';
import { ROLE_LABEL } from '@/lib/labels';
import { createInvite } from '../actions';

/** Makes an invitation link and shows it once, to copy and hand over in person or over a channel you trust. */
export function InviteAdmin() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [link, setLink] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const show = () => {
    setError(undefined);
    setLink(undefined);
    setCopied(false);
    setOpen(true);
  };
  const submit = async (form: FormData) => {
    const result = await createInvite(form);
    if (result.ok && result.link) setLink(result.link);
    else setError(result.error ?? 'Something went wrong. Please try again.');
  };
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button type="button" className={`${buttonClasses('primary')} gap-2`} onClick={show}>
        <Icon name="group_add" size={20} /> Invite administrator
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Invite an administrator"
        description="They need an existing UGNAYA account with a confirmed email. The link works once, for 72 hours, and only for that email. Recorded in the audit log.">
        {link ? (
          <div className="space-y-4">
            <p className="text-sm">Give this link to them directly (not by forwarding it to a shared inbox). It won’t be shown again.</p>
            <p className="break-all rounded-md border border-border bg-surface p-3 font-mono text-sm" aria-label="Invitation link">{link}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClasses('primary')} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
              <button type="button" className={buttonClasses('secondary')} onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        ) : (
          <form action={submit} className="space-y-4">
            <FormMessage message={error} />
            <label className="block text-sm font-medium">
              Email of their account
              <input name="email" type="email" required autoComplete="off" maxLength={200}
                className="mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3" />
            </label>
            <label className="block text-sm font-medium">
              Role
              <select name="role" defaultValue="support_admin" className="mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3">
                {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-ink-muted">Give the least access that does the job.</span>
            </label>
            <label className="block text-sm font-medium">
              Reason (required)
              <textarea name="reason" required rows={3} maxLength={2000} className="mt-2 block w-full rounded-md border border-border-strong bg-card px-3 py-2" />
            </label>
            <SubmitButton pendingLabel="Creating…">Create invitation link</SubmitButton>
          </form>
        )}
      </Dialog>
    </>
  );
}
