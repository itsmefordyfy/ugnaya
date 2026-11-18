'use client';

import { useState } from 'react';
import { FormMessage, buttonClasses, useToast } from '@ugnaya/web-ui';
import { addNote } from '@/actions/notes';

export function NoteForm({ entityType, entityId }: { entityType: 'merchant' | 'user'; entityId: string }) {
  const [error, setError] = useState<string | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const submit = async (form: FormData) => {
    setPending(true);
    const result = await addNote(form);
    setPending(false);
    if (result.ok) {
      setError(undefined);
      setFormKey((k) => k + 1);
      toast.show({ tone: 'success', title: 'Note added' });
    } else {
      setError(result.error);
    }
  };
  return (
    <form key={formKey} action={submit} className="space-y-2">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <FormMessage message={error} />
      <label className="block text-sm font-medium">
        Add an internal note
        <span className="mt-0.5 block text-xs font-normal text-ink-muted">Visible to administrators only. Notes can’t be edited or deleted.</span>
        <textarea name="body" required maxLength={4000} rows={3} className="mt-2 block w-full rounded-md border border-border-strong bg-card px-3 py-2 text-base" />
      </label>
      <button type="submit" disabled={pending} className={`${buttonClasses('secondary')} disabled:opacity-60`}>{pending ? 'Saving…' : 'Add note'}</button>
    </form>
  );
}
