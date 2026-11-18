'use client';

import { useState } from 'react';
import { Dialog, FormMessage, SubmitButton, buttonClasses, useToast } from '@ugnaya/web-ui';
import { changeRole, revokeAdmin, type TeamState } from '../actions';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin', operations_admin: 'Operations admin', finance_admin: 'Finance admin', support_admin: 'Support admin', analyst: 'Analyst',
};

export type MemberActionsProps = { userId: string; email: string; role: string; isSelf: boolean };

/** Change role or revoke access. Both need a written reason; the database refuses anything else. */
export function MemberActions({ userId, email, role, isSelf }: MemberActionsProps) {
  const [mode, setMode] = useState<'role' | 'revoke' | null>(null);
  const [error, setError] = useState<string | undefined>();
  const toast = useToast();

  const open = (next: 'role' | 'revoke') => {
    setError(undefined);
    setMode(next);
  };
  // The form action runs the server action and handles its own result: no effect needed.
  const run = (action: (previous: TeamState, form: FormData) => Promise<TeamState>, success: string) => async (form: FormData) => {
    const result = await action({}, form);
    if (result.ok) {
      toast.show({ tone: 'success', title: success });
      setMode(null);
    } else {
      setError(result.error);
    }
  };

  if (isSelf) return <span className="text-sm text-ink-muted">You</span>;
  return (
    <div className="flex gap-2">
      <button type="button" className={buttonClasses('secondary')} onClick={() => open('role')}>Change role</button>
      <button type="button" className={buttonClasses('secondary')} onClick={() => open('revoke')}>Revoke</button>

      <Dialog open={mode === 'role'} onClose={() => setMode(null)} title={`Change role for ${email}`} description="The change takes effect on their next request and is recorded in the audit log.">
        <form action={run(changeRole, 'Role updated')} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />
          <FormMessage message={error} />
          <label className="block text-sm font-medium">
            New role
            <select name="role" defaultValue={role} className="mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3">
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Reason (required)
            <textarea name="reason" required rows={3} className="mt-2 block w-full rounded-md border border-border-strong bg-card px-3 py-2" />
          </label>
          <SubmitButton pendingLabel="Saving…">Save role</SubmitButton>
        </form>
      </Dialog>

      <Dialog open={mode === 'revoke'} onClose={() => setMode(null)} title={`Revoke access for ${email}?`} description="They lose all admin access on their very next request. Their past actions stay in the audit log.">
        <form action={run(revokeAdmin, 'Access revoked')} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />
          <FormMessage message={error} />
          <label className="block text-sm font-medium">
            Reason (required)
            <textarea name="reason" required rows={3} className="mt-2 block w-full rounded-md border border-border-strong bg-card px-3 py-2" />
          </label>
          <SubmitButton pendingLabel="Revoking…">Revoke access</SubmitButton>
        </form>
      </Dialog>
    </div>
  );
}
