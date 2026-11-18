/**
 * Storage paths for the merchant portal. Every path starts with the merchant id (<merchant_id>/<file>): the storage
 * policies read that folder to decide who may upload, read or delete (migration 20261107000500_merchant_portal.sql).
 */
export const DOCUMENTS_BUCKET = 'merchant-documents';
export const LOGOS_BUCKET = 'merchant-logos';
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const DOCUMENT_KINDS = [
  { value: 'business_registration', label: 'Business registration (DTI, SEC or CDA)' },
  { value: 'tax_registration', label: 'Tax registration (BIR Form 2303)' },
  { value: 'permit', label: 'Mayor’s or business permit' },
  { value: 'owner_id', label: 'Owner’s government ID' },
  { value: 'storefront_photo', label: 'Photo of the storefront' },
  { value: 'other', label: 'Other' },
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]['value'];

export const isDocumentKind = (value: unknown): value is DocumentKind => DOCUMENT_KINDS.some((k) => k.value === value);
export const documentKindLabel = (value: string): string => DOCUMENT_KINDS.find((k) => k.value === value)?.label ?? 'Document';

/** Why a file can't be uploaded, or null when it can. Storage enforces the same limits. */
export function documentFileProblem(file: { type: string; size: number }): string | null {
  if (!(DOCUMENT_TYPES as readonly string[]).includes(file.type)) return 'Use a PDF, JPEG, PNG or WebP file.';
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'That file is over 10 MB. Use a smaller scan or photo.';
  return null;
}

export function logoFileProblem(file: { type: string; size: number }): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return 'Use a JPEG, PNG or WebP image.';
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > MAX_LOGO_BYTES) return 'The logo must be 2 MB or smaller.';
  return null;
}

/** A file name safe for a storage key: letters, digits, dot, dash and underscore, at most 80 characters. */
export function safeFileName(name: string): string {
  const cleaned = name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+/, '').slice(-80);
  return cleaned || 'file';
}

/** merchant-documents/<merchant_id>/<random>-<filename> */
export const documentPath = (merchantId: string, random: string, fileName: string): string =>
  `${merchantId}/${random}-${safeFileName(fileName)}`;

const LOGO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** merchant-logos/<merchant_id>/logo-<random>.<ext> */
export const logoPath = (merchantId: string, random: string, contentType: string): string =>
  `${merchantId}/logo-${random}.${LOGO_EXT[contentType] ?? 'png'}`;

/** The public address of a logo (the bucket is public; logos are shown to customers in the app). */
export function logoUrl(supabaseUrl: string | undefined, path: string | null | undefined): string | null {
  if (!supabaseUrl || !path) return null;
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${LOGOS_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
