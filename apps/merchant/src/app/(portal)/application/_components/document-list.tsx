'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog, Icon, useToast } from '@ugnaya/web-ui';
import { formatBytes, documentKindLabel } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import { removeDocument } from '../actions';

export type DocumentRow = { id: string; kind: string; fileName: string; sizeBytes: number; createdAt: string; url: string | null };

/** The uploaded documents; Remove while the application is with the business (asks first, since it can’t be undone). */
export function DocumentList({ documents, editable }: { documents: DocumentRow[]; editable: boolean }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState<DocumentRow | null>(null);
  const [pending, start] = useTransition();

  function remove(doc: DocumentRow) {
    start(async () => {
      const result = await removeDocument(doc.id);
      toast.show(result.ok ? { tone: 'success', title: result.message ?? 'Removed' } : { tone: 'error', title: 'Couldn’t remove it', body: result.error });
    });
  }

  return (
    <>
      <ul className="divide-y divide-divider">
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Icon name={doc.fileName.toLowerCase().endsWith('.pdf') ? 'description' : 'image'} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{doc.fileName}</p>
              <p className="text-sm text-ink-muted">{documentKindLabel(doc.kind)} · <span className="tabular">{formatBytes(doc.sizeBytes)}</span> · {formatDate(doc.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-pill px-3 text-sm font-semibold text-accent-text hover:bg-primary-soft">
                  <Icon name="open_in_new" size={18} />View<span className="sr-only"> {doc.fileName}</span>
                </a>
              )}
              {editable && (
                <button type="button" disabled={pending} onClick={() => setConfirm(doc)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-pill px-3 text-sm font-semibold text-danger-text hover:bg-danger-soft disabled:opacity-60">
                  <Icon name="delete" size={18} />Remove<span className="sr-only"> {doc.fileName}</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && remove(confirm)}
        title="Remove this document?"
        description={confirm ? `Remove ${confirm.fileName} from your application? The file is deleted.` : ''}
        confirmLabel="Remove"
        danger
      />
    </>
  );
}
