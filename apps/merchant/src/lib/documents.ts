import { DOCUMENT_TYPES, isDocumentKind, MAX_DOCUMENT_BYTES, type DocumentKind } from './storage.ts';

export type DocumentRecord = { kind: DocumentKind; path: string; fileName: string; contentType: string; sizeBytes: number };

/**
 * What the browser reports after uploading a document, checked before merchant_add_document records it. The function
 * checks again (role, status, path, type, that the object exists); this only turns bad input into a sentence early.
 */
export function parseDocumentRecord(form: FormData, merchantId: string): { ok: true; value: DocumentRecord } | { ok: false; error: string } {
  const kind = String(form.get('kind') ?? '');
  const path = String(form.get('path') ?? '');
  const fileName = String(form.get('fileName') ?? '').trim().slice(0, 200);
  const contentType = String(form.get('contentType') ?? '');
  const sizeBytes = Number(form.get('sizeBytes'));
  if (!isDocumentKind(kind)) return { ok: false, error: 'Choose what kind of document this is.' };
  if (!path.startsWith(`${merchantId}/`) || path.includes('..') || path.length > 300) return { ok: false, error: 'The upload didn’t finish. Choose the file again.' };
  if (!fileName) return { ok: false, error: 'The file needs a name.' };
  if (!(DOCUMENT_TYPES as readonly string[]).includes(contentType)) return { ok: false, error: 'Use a PDF, JPEG, PNG or WebP file.' };
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_DOCUMENT_BYTES) return { ok: false, error: 'That file is over 10 MB. Use a smaller scan or photo.' };
  return { ok: true, value: { kind, path, fileName, contentType, sizeBytes } };
}

/** The documents we ask every business for; the rest are optional. Shown as a checklist beside the upload. */
export const RECOMMENDED: { kind: DocumentKind; why: string }[] = [
  { kind: 'business_registration', why: 'Shows the business is registered (DTI for a sole proprietor, SEC or CDA otherwise).' },
  { kind: 'permit', why: 'Your current mayor’s or business permit for the address you registered.' },
  { kind: 'owner_id', why: 'A government ID of the owner, matching the name on the registration.' },
  { kind: 'storefront_photo', why: 'A clear photo of the shop front with its sign.' },
];

/** Which recommended kinds are still missing. */
export const missingKinds = (uploaded: readonly string[]): DocumentKind[] =>
  RECOMMENDED.map((r) => r.kind).filter((k) => !uploaded.includes(k));

/** The reply to UGNAYA's request: 1 to 2,000 characters. */
export function parseReply(form: FormData): { ok: true; value: string } | { ok: false; error: string } {
  const message = String(form.get('message') ?? '').trim();
  if (!message) return { ok: false, error: 'Write a short reply first.' };
  if (message.length > 2000) return { ok: false, error: 'Keep the reply under 2,000 characters.' };
  return { ok: true, value: message };
}
