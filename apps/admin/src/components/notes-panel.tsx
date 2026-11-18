import { callAdmin } from '@/lib/rpc';
import type { Note } from '@/lib/types';
import { LocalTime } from './local-time';
import { NoteForm } from './note-form';
import { Section } from './page-header';
import { RpcProblem } from './rpc-problem';

/** Internal notes for a business or a person: newest first, plus the form when the role may write (notes.write). */
export async function NotesPanel({ entityType, entityId, canWrite }: { entityType: 'merchant' | 'user'; entityId: string; canWrite: boolean }) {
  const notes = await callAdmin<Note[]>('admin_list_notes', { p_entity_type: entityType, p_entity_id: entityId });
  return (
    <Section title="Internal notes" description="Administrators only; never shown to the business or the customer.">
      {canWrite && <div className="mb-4"><NoteForm entityType={entityType} entityId={entityId} /></div>}
      {!notes.ok ? <RpcProblem failure={notes} what="notes" /> : notes.data.length === 0 ? (
        <p className="text-sm text-ink-muted">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-divider">
          {notes.data.map((n) => (
            <li key={n.id} className="py-3 text-sm">
              <p className="whitespace-pre-wrap break-words">{n.body}</p>
              <p className="mt-1 text-xs text-ink-muted">{n.author_email ?? 'Former administrator'} · <LocalTime iso={n.created_at} /></p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
