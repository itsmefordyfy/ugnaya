'use client';

import { startTransition, useActionState, useRef, useState, useTransition, type FormEvent } from 'react';
import { FormMessage, Icon, buttonClasses } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import { SelectField } from '@/components/fields';
import type { ActionState } from '@/lib/action-state';
import { createClient } from '@/lib/supabase/client';
import { DOCUMENT_KINDS, DOCUMENTS_BUCKET, documentFileProblem, documentPath } from '@/lib/storage';
import { addDocument } from '../actions';

export type DocumentUploadProps = { merchantId: string; suggestedKind?: string };

/**
 * Uploads straight from the browser to the private bucket with the person's own session (files never pass through
 * our server, and storage checks the role and the application status), then records it with merchant_add_document.
 */
export function DocumentUpload({ merchantId, suggestedKind }: DocumentUploadProps) {
  const [state, record, recording] = useActionState<ActionState, FormData>(addDocument, {});
  const [problem, setProblem] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(state, () => formRef.current?.reset());

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblem(null);
    const fields = new FormData(event.currentTarget);
    const file = fields.get('file');
    const kind = String(fields.get('kind') ?? '');
    if (!kind) return setProblem('Choose what kind of document this is.');
    if (!(file instanceof File) || file.size === 0) return setProblem('Choose a file to upload.');
    const fileProblem = documentFileProblem(file);
    if (fileProblem) return setProblem(fileProblem);

    startUpload(async () => {
      const random = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
      const path = documentPath(merchantId, random, file.name);
      const { error } = await createClient().storage.from(DOCUMENTS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setProblem(error.message.includes('row-level security')
          ? 'Documents can’t be changed right now (the application is with UGNAYA, or your role can’t upload).'
          : 'The upload didn’t finish. Check your connection and try again.');
        return;
      }
      const data = new FormData();
      data.set('kind', kind);
      data.set('path', path);
      data.set('fileName', file.name);
      data.set('contentType', file.type);
      data.set('sizeBytes', String(file.size));
      // After an await the transition context is gone, so the action is dispatched in a new one.
      startTransition(() => record(data));
    });
  }

  const message = problem ?? (state.ok === false ? state.error : undefined);
  return (
    <form ref={formRef} onSubmit={upload} className="space-y-4" noValidate>
      <FormMessage message={message} />
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <SelectField
          name="kind"
          label="Kind of document"
          options={DOCUMENT_KINDS}
          placeholder="Choose one"
          defaultValue={suggestedKind ?? ''}
          required
        />
        <div>
          <label htmlFor="field-file" className="block text-sm font-medium">File</label>
          <input
            id="field-file"
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            aria-describedby="field-file-hint"
            className="mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card text-base text-ink file:mr-3 file:min-h-11 file:border-0 file:bg-primary-soft file:px-4 file:font-semibold file:text-primary"
          />
        </div>
        <button type="submit" disabled={uploading || recording} className={`${buttonClasses('primary')} disabled:opacity-60`}>
          <Icon name="upload" size={20} />{uploading || recording ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <p id="field-file-hint" className="text-sm text-ink-muted">PDF, JPEG, PNG or WebP, up to 10 MB. Photos from a phone are fine if they’re sharp and readable.</p>
    </form>
  );
}
