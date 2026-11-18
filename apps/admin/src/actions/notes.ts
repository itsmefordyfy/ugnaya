'use server';

import type { ActionState } from '@/lib/action-state';
import { isUuid } from '@/lib/paging';
import { requestContext } from '@/lib/request-context';
import { runAdmin, text } from '@/lib/run-action';

/** Internal notes on a business or a person (notes.write). Notes are history: they can't be edited or deleted. */
export async function addNote(form: FormData): Promise<ActionState> {
  const entityType = text(form, 'entityType');
  const entityId = text(form, 'entityId');
  const body = text(form, 'body');
  if (entityType !== 'merchant' && entityType !== 'user') return { error: 'Notes can only be added to a business or a person.' };
  if (!isUuid(entityId)) return { error: 'That item doesn’t exist.' };
  if (!body) return { error: 'Write the note first.' };
  return runAdmin('admin_add_note', { p_entity_type: entityType, p_entity_id: entityId, p_body: body, p_context: await requestContext() },
    [entityType === 'merchant' ? `/merchants/${entityId}` : `/users/${entityId}`], 'Note added');
}
