import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { isUuid } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import { createClient } from '@/lib/supabase/server';
import type { MerchantDocument } from '@/lib/types';

/**
 * Opens one verification document. The link is signed only when clicked, server-side, with the administrator's own
 * session (storage RLS allows merchants.review or users.view_pii), and lives 60 seconds; the page never carries a long-lived file URL.
 */
export async function GET(_request: Request, ctx: RouteContext<'/merchants/[id]/documents/[documentId]'>) {
  const admin = await requireAdmin('merchants.view');
  if (!admin.permissions.includes('merchants.review') && !admin.permissions.includes('users.view_pii')) {
    return new NextResponse('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id, documentId } = await ctx.params;
  const notFound = () => new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (!isUuid(id) || !isUuid(documentId)) return notFound();

  const documents = await callAdmin<MerchantDocument[]>('admin_merchant_documents', { p_merchant_id: id });
  if (!documents.ok) return new NextResponse('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  const doc = documents.data.find((d) => d.id === documentId);
  if (!doc) return notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('merchant-documents').createSignedUrl(doc.file_path, 60);
  if (error || !data?.signedUrl) return new NextResponse('The file could not be opened. It may have been removed.', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const response = NextResponse.redirect(data.signedUrl, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
