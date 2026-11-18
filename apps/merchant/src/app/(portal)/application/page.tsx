import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Icon, Skeleton, Ugi, buttonClasses } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader, Panel } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { JOURNEY, REVIEW_ACTIONS, STATUS_INFO, canEditDocuments, journeyStep } from '@/lib/application';
import { requireStaff } from '@/lib/auth/guard';
import { RECOMMENDED, missingKinds } from '@/lib/documents';
import { friendlyError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { CONTACT_EMAIL } from '@/lib/site';
import { DOCUMENTS_BUCKET, documentKindLabel } from '@/lib/storage';
import { createClient } from '@/lib/supabase/server';
import { DocumentList, type DocumentRow } from './_components/document-list';
import { DocumentUpload } from './_components/document-upload';
import { ReplyForm } from './_components/reply-form';
import { SubmitApplication } from './_components/submit-application';

export const metadata: Metadata = { title: 'Application' };

export default function ApplicationPage({ searchParams }: PageProps<'/application'>) {
  return (
    <Suspense fallback={<ApplicationSkeleton />}>
      <Application searchParams={searchParams} />
    </Suspense>
  );
}

async function Application({ searchParams }: Pick<PageProps<'/application'>, 'searchParams'>) {
  const { welcome } = await searchParams;
  const ctx = await requireStaff('application');
  const supabase = await createClient();
  const [merchantResult, documentsResult, reviewsResult] = await Promise.all([
    supabase.from('merchants').select('status, trade_name, submitted_at, verified_at, created_at').eq('id', ctx.merchant.id).single(),
    supabase.from('merchant_documents').select('id, kind, file_name, file_path, size_bytes, created_at').eq('merchant_id', ctx.merchant.id).order('created_at'),
    supabase.from('merchant_reviews').select('id, action, from_status, to_status, reason, actor_kind, created_at').eq('merchant_id', ctx.merchant.id).order('created_at', { ascending: false }).limit(50),
  ]);

  if (merchantResult.error) return <><PageHeader title="Application" /><DataError message={friendlyError(merchantResult.error)} /></>;
  const merchant = merchantResult.data;
  const status = merchant.status;
  const info = STATUS_INFO[status];
  const editable = canEditDocuments(status);
  const reviews = reviewsResult.data ?? [];
  const latest = (action: string) => reviews.find((r) => r.action === action) ?? null;
  const request = status === 'info_required' ? latest('request_info') : null;
  const decision = status === 'rejected' ? latest('reject') : status === 'suspended' ? latest('suspend') : null;

  // Short-lived links to view each private document (the bucket checks the role on every read).
  let documents: DocumentRow[] = [];
  if (!documentsResult.error && documentsResult.data.length > 0) {
    const { data: signed } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrls(documentsResult.data.map((d) => d.file_path), 600);
    documents = documentsResult.data.map((d, i) => ({
      id: d.id, kind: d.kind, fileName: d.file_name, sizeBytes: d.size_bytes, createdAt: d.created_at,
      url: signed?.[i]?.signedUrl ?? null,
    }));
  }
  const missing = missingKinds(documents.map((d) => d.kind));
  const step = journeyStep(status);

  return (
    <div className="space-y-6">
      <PageHeader title="Application" description="Verification keeps UGNAYA trustworthy for customers. Here is where your business stands." />

      {welcome === '1' && status === 'draft' && (
        <div role="status" className="flex items-center gap-4 rounded-lg bg-success-soft p-5 text-success-text">
          <Ugi pose="celebrating" height={72} />
          <p><strong>{merchant.trade_name} is registered.</strong> One last step: upload your documents and send the application.</p>
        </div>
      )}

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <StatusBadge status={status} />
            <p className="mt-3 text-lg">{info.summary}</p>
            <p className="mt-2 text-sm text-ink-muted">
              {merchant.submitted_at ? <>Sent {formatDateTime(merchant.submitted_at)}. </> : null}
              {merchant.verified_at ? <>Approved {formatDateTime(merchant.verified_at)}.</> : null}
            </p>
          </div>
          {status === 'active' && ctx.role !== 'cashier' && (
            <Link href="/dashboard" className={buttonClasses('primary')}>Go to the dashboard</Link>
          )}
        </div>
        <ol className="mt-6 grid gap-2 sm:grid-cols-4" aria-label="Application progress">
          {JOURNEY.map((j, i) => (
            <li key={j.key} aria-current={i === step ? 'step' : undefined} className="flex items-center gap-2 sm:flex-col sm:items-start">
              <span aria-hidden="true" className={`h-1.5 w-10 rounded-pill sm:w-full ${i <= step ? 'bg-primary' : 'bg-border'}`} />
              <span className={`text-sm ${i === step ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                {i < step ? <span className="sr-only">Done: </span> : null}{j.label}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      {request && (
        <Panel title="UGNAYA needs more information" id="request" className="border-warning">
          <figure className="rounded-md bg-warning-soft p-4 text-warning-text">
            <figcaption className="flex items-center gap-2 text-sm font-semibold"><Icon name="contact_support" size={20} />Message from the UGNAYA reviewer, {formatDateTime(request.created_at)}</figcaption>
            <blockquote className="mt-2 whitespace-pre-line">{request.reason ?? 'Please contact us for details.'}</blockquote>
          </figure>
          <div className="mt-6"><ReplyForm /></div>
        </Panel>
      )}

      {decision && (
        <Panel title={status === 'rejected' ? 'Why the application wasn’t approved' : 'Why the business is suspended'}>
          <p className="whitespace-pre-line">{decision.reason ?? 'No reason was recorded.'}</p>
          <p className="mt-4 text-sm text-ink-muted">
            If something has changed, email <a href={`mailto:${CONTACT_EMAIL}`} className="link font-semibold">{CONTACT_EMAIL}</a> and we’ll take another look.
          </p>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Verification documents" description={editable ? 'Only you, your managers and UGNAYA’s reviewers can open these files.' : 'Documents can’t be changed while the application is being reviewed or after a decision.'}>
          {documentsResult.error ? (
            <DataError message={friendlyError(documentsResult.error)} />
          ) : documents.length === 0 ? (
            <p className="rounded-md border border-dashed border-border-strong p-5 text-center text-ink-muted">No documents yet. {editable ? 'Upload the first one below.' : ''}</p>
          ) : (
            <DocumentList documents={documents} editable={editable} />
          )}
          {editable && (
            <div className="mt-6 border-t border-divider pt-6">
              <DocumentUpload merchantId={ctx.merchant.id} suggestedKind={missing[0]} />
            </div>
          )}
        </Panel>

        <Panel title="What to upload">
          <ul className="space-y-3">
            {RECOMMENDED.map((r) => {
              const has = !missing.includes(r.kind);
              return (
                <li key={r.kind} className="flex gap-3">
                  <Icon name={has ? 'check_circle' : 'pending'} size={20} className={`mt-0.5 shrink-0 ${has ? 'text-success-text' : 'text-ink-subtle'}`} label={has ? 'Uploaded' : 'Not yet'} />
                  <span>
                    <span className="block text-sm font-medium">{documentKindLabel(r.kind)}</span>
                    <span className="block text-sm text-ink-muted">{r.why}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {status === 'draft' && (
        <Panel title="Send your application">
          {ctx.role === 'owner' ? (
            <>
              <p className="mb-4 max-w-2xl text-ink-muted">When your documents are in, send the application. We usually start a review within one business day and may call or visit.</p>
              <SubmitApplication documentCount={documents.length} tradeName={merchant.trade_name} />
            </>
          ) : (
            <p className="text-ink-muted">Only the owner can send the application. You can upload documents to help.</p>
          )}
        </Panel>
      )}

      <Panel title="History">
        {reviewsResult.error ? (
          <DataError message={friendlyError(reviewsResult.error)} />
        ) : reviews.length === 0 ? (
          <p className="text-ink-muted">Nothing yet. Each step of your application will be listed here.</p>
        ) : (
          <ol className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="flex gap-3">
                <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-pill ${r.actor_kind === 'admin' ? 'bg-primary' : 'bg-accent'}`} />
                <div className="min-w-0">
                  <p className="font-medium">{REVIEW_ACTIONS[r.action] ?? r.action} <span className="font-normal text-ink-muted">· {r.actor_kind === 'admin' ? 'UGNAYA' : 'Your team'}</span></p>
                  <p className="text-sm text-ink-muted">{formatDateTime(r.created_at)}{r.to_status ? ` · ${STATUS_INFO[r.to_status].label}` : ''}</p>
                  {r.reason && <p className="mt-1 whitespace-pre-line text-sm">{r.reason}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <p className="text-sm text-ink-muted">
        Your business details are on the <Link href="/profile" className="link font-semibold">business profile</Link>, and branches and hours under{' '}
        <Link href="/branches" className="link font-semibold">Branches &amp; hours</Link>; both stay editable at any time.
      </p>
    </div>
  );
}

function ApplicationSkeleton() {
  return (
    <div role="status" aria-label="Loading your application" className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
