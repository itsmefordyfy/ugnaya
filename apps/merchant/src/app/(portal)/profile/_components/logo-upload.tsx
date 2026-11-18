'use client';

import { useRef, useState, useTransition } from 'react';
import { FormMessage, Icon, buttonClasses, useToast } from '@ugnaya/web-ui';
import { createClient } from '@/lib/supabase/client';
import { LOGOS_BUCKET, logoFileProblem, logoPath } from '@/lib/storage';
import { setLogo } from '../actions';

export type LogoUploadProps = { merchantId: string; tradeName: string; url: string | null };

/** Uploads the logo from the browser to the public logos bucket with the person's session, then saves its path. */
export function LogoUpload({ merchantId, tradeName, url }: LogoUploadProps) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | undefined>();
  const [pending, start] = useTransition();

  function choose(file: File | undefined) {
    setProblem(undefined);
    if (!file) return;
    const issue = logoFileProblem(file);
    if (issue) return setProblem(issue);
    start(async () => {
      const random = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
      const path = logoPath(merchantId, random, file.type);
      const { error } = await createClient().storage.from(LOGOS_BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
      if (error) return setProblem('The upload didn’t finish. Check your connection and try again.');
      const result = await setLogo(path);
      if (result.ok) toast.show({ tone: 'success', title: result.message ?? 'Logo updated' });
      else setProblem(result.error);
      if (input.current) input.current.value = '';
    });
  }

  function remove() {
    start(async () => {
      const result = await setLogo(null);
      if (result.ok) toast.show({ tone: 'success', title: result.message ?? 'Logo removed' });
      else setProblem(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {url ? (
        // A merchant-uploaded image from the public logos bucket.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${tradeName} logo`} width={96} height={96} className="size-24 shrink-0 rounded-lg border border-border bg-card object-cover" />
      ) : (
        <span aria-hidden="true" className="inline-flex size-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface font-display text-3xl font-bold text-primary">
          {tradeName.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">A square JPEG, PNG or WebP, up to 2 MB. Shown on your page in the UGNAYA app.</p>
        <div className="flex flex-wrap gap-2">
          <label className={`${buttonClasses('secondary')} cursor-pointer ${pending ? 'pointer-events-none opacity-60' : ''}`}>
            <Icon name="upload" size={20} />{pending ? 'Working…' : url ? 'Replace logo' : 'Upload logo'}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending}
              onChange={(event) => choose(event.target.files?.[0])} />
          </label>
          {url && (
            <button type="button" onClick={remove} disabled={pending} className="inline-flex min-h-11 items-center gap-1 rounded-pill px-4 text-sm font-semibold text-danger-text hover:bg-danger-soft disabled:opacity-60">
              <Icon name="delete" size={20} />Remove
            </button>
          )}
        </div>
        <FormMessage message={problem} />
      </div>
    </div>
  );
}
