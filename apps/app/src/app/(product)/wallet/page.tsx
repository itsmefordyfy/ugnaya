import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, EmptyState, Skeleton, Ugi } from '@ugnaya/web-ui';
import { requireArea } from '@/lib/auth/guard';

export const metadata: Metadata = { title: 'Your wallet' };

export default function Wallet() {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading your wallet" className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <WalletContent />
    </Suspense>
  );
}

async function WalletContent() {
  const { viewer, account } = await requireArea('wallet', '/wallet');
  const name = account.displayName ?? viewer.name;
  return (
    <div className="space-y-6">
      <Card variant="brand" as="section">
        <p className="text-sm font-medium">{name ? `Hello, ${name}` : 'Hello'}</p>
        <p className="mt-4 text-sm font-medium">Your UGNAYA member ID</p>
        <p className="tabular mt-1 font-display text-4xl font-extrabold tracking-widest" aria-label={`Member ID ${account.memberId ?? ''}`}>
          {account.memberId ?? '—'}
        </p>
        <p className="mt-4 text-sm">A cashier can find you with this ID.</p>
      </Card>
      <Card className="p-0" as="section">
        <EmptyState
          illustration={<Ugi pose="helpful" height={130} />}
          title="Your wallet is ready"
          body="Your points, rewards, vouchers and QR code will appear here as soon as the first shops go live. Nothing to do for now."
        />
      </Card>
    </div>
  );
}
