'use server';

import { refresh } from 'next/cache';
import { done, failed, type ActionState } from '@/lib/action-state';
import { canEditDocuments } from '@/lib/application';
import { actionContext } from '@/lib/auth/action';
import { parseDocumentRecord, parseReply } from '@/lib/documents';
import { friendlyError } from '@/lib/errors';
import { DOCUMENTS_BUCKET } from '@/lib/storage';

/** Records a file the browser has just uploaded to merchant-documents/<merchant_id>/… (merchant_add_document checks it). */
export async function addDocument(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('application');
  const parsed = parseDocumentRecord(form, ctx.merchant.id);
  if (!parsed.ok) return failed(parsed.error);
  const d = parsed.value;
  const { error } = await supabase.rpc('merchant_add_document', {
    p_merchant_id: ctx.merchant.id, p_kind: d.kind, p_file_path: d.path, p_file_name: d.fileName,
    p_content_type: d.contentType, p_size_bytes: d.sizeBytes,
  });
  if (error) {
    // Don't leave an orphaned file behind when the record was refused.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([d.path]);
    return failed(friendlyError(error));
  }
  refresh();
  return done(`${d.fileName} added`);
}

/** Forgets a document, then deletes the stored file (merchant_remove_document returns its path). */
export async function removeDocument(documentId: string): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('application');
  if (!canEditDocuments(ctx.merchant.status)) return failed(friendlyError('application_locked'));
  const { data: path, error } = await supabase.rpc('merchant_remove_document', { p_document_id: documentId });
  if (error) return failed(friendlyError(error));
  if (typeof path === 'string' && path) {
    // The record is gone either way; a file left behind here is only reachable by this business's managers.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
  }
  refresh();
  return done('Document removed');
}

/** The owner sends the draft for review (merchant_submit_application: owner only, at least one document). */
export async function submitApplication(): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('application');
  if (ctx.role !== 'owner') return failed(friendlyError('forbidden'));
  const { error } = await supabase.rpc('merchant_submit_application', { p_merchant_id: ctx.merchant.id });
  if (error) return failed(friendlyError(error));
  refresh();
  return done('Application sent. We’ll be in touch soon.');
}

/** Answers UGNAYA's request for information; the application goes back to "under review". */
export async function respondToReview(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('application');
  const parsed = parseReply(form);
  if (!parsed.ok) return failed(parsed.error, { message: parsed.error });
  const { error } = await supabase.rpc('merchant_respond_review', { p_merchant_id: ctx.merchant.id, p_message: parsed.value });
  if (error) return failed(friendlyError(error));
  refresh();
  return done('Reply sent to UGNAYA');
}
