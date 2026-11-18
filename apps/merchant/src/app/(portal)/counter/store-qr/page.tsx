import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Icon, Logo, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { LockedNotice } from '@/components/locked-notice';
import { PageHeader } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { encodeQr, qrPath, storeQrText } from '@/lib/qr';
import { PrintButton } from './print-button';

export const metadata: Metadata = { title: 'Store QR' };

/** When printing, only the poster prints: everything else on the page (the portal's navigation included) is hidden. */
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  [data-print-area], [data-print-area] * { visibility: visible !important; }
  [data-print-area] { position: absolute; left: 0; top: 0; width: 100%; border: 0 !important; box-shadow: none !important; }
  @page { margin: 12mm; }
}`;

export default function StoreQrPage() {
  return (
    <Suspense fallback={<StoreQrSkeleton />}>
      <StoreQr />
    </Suspense>
  );
}

async function StoreQr() {
  const ctx = await requireStaff('counter');
  const header = (
    <PageHeader
      title="Store QR"
      description="Put this by the till or on the door. Customers scan it with the UGNAYA app to open your shop’s page: your rewards, offers and their points here."
      actions={!ctx.locked ? <PrintButton /> : undefined}
    />
  );
  if (ctx.locked) {
    return (
      <>
        {header}
        <LockedNotice feature="The store QR" status={ctx.merchant.status} showApplicationLink={ctx.role !== 'cashier'}>
          Customers can only open your shop in the app once it’s approved, so the code would lead nowhere until then.
        </LockedNotice>
      </>
    );
  }

  // `M:<merchant id>` is what the customer app reads; it holds nothing secret (the id is in the public directory).
  const qr = encodeQr(storeQrText(ctx.merchant.id));
  const quiet = 4;
  const box = qr.size + quiet * 2;
  return (
    <>
      <style>{PRINT_CSS}</style>
      {header}
      <div data-print-area className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center text-ink print:max-w-none">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted">Scan to join our rewards</p>
        <p className="mt-2 font-display text-3xl font-extrabold leading-tight">{ctx.merchant.tradeName}</p>
        <svg
          viewBox={`0 0 ${box} ${box}`}
          role="img"
          aria-label={`QR code for ${ctx.merchant.tradeName} on UGNAYA`}
          shapeRendering="crispEdges"
          className="mx-auto mt-6 aspect-square w-full max-w-80 bg-card print:max-w-[110mm]"
        >
          {/* Always black on white, whatever the theme: scanners read dark modules on a light ground. */}
          <rect width={box} height={box} fill="white" />
          <path d={qrPath(qr, quiet)} fill="black" />
        </svg>
        <p className="mt-6 text-lg font-semibold">Open the UGNAYA app and scan this code</p>
        <p className="mt-1 text-ink-muted">Earn points every visit. One wallet for every UGNAYA shop.</p>
        <div className="mt-6 flex justify-center">
          <Logo height={28} />
        </div>
      </div>
      <p className="mt-6 text-center print:hidden">
        <Link href="/counter" className={buttonClasses('ghost')}><Icon name="chevron_left" size={20} />Back to the counter</Link>
      </p>
    </>
  );
}

function StoreQrSkeleton() {
  return (
    <div role="status" aria-label="Loading the store QR" className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mx-auto h-[32rem] w-full max-w-md rounded-xl" />
    </div>
  );
}
