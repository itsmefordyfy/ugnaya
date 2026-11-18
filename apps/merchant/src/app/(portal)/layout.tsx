import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Icon, Skeleton } from '@ugnaya/web-ui';
import { PortalNav } from '@/components/portal-nav';
import { STATUS_INFO, needsStatusBanner } from '@/lib/application';
import { isLocked, navFor, roleLabel } from '@/lib/auth/access';
import { getMembership, getViewer } from '@/lib/auth/session';
import { logoUrl } from '@/lib/storage';

/** The signed-in portal. Each page checks the person's role again with requireStaff(); the database checks every query. */
export default function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const membership = await getMembership(viewer.id);
  if (!membership) redirect('/register');
  const { merchant, role } = membership;
  const status = STATUS_INFO[merchant.status];
  const items = navFor(role).map((s) => ({ href: s.path, label: s.label, icon: s.icon, group: s.group, locked: isLocked(s.key, merchant.status) }));

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <PortalNav
        items={items}
        business={{ name: merchant.tradeName, statusLabel: status.label, logoUrl: logoUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, merchant.logoPath) }}
        person={{ name: membership.displayName || viewer.name || viewer.email || 'You', roleLabel: roleLabel(role, membership.branchIds) }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {role !== 'cashier' && needsStatusBanner(merchant.status) && (
          <div className={`border-b px-4 py-3 sm:px-8 ${merchant.status === 'info_required' ? 'border-warning-soft bg-warning-soft text-warning-text' : merchant.status === 'rejected' || merchant.status === 'suspended' ? 'border-danger-soft bg-danger-soft text-danger-text' : 'border-divider bg-primary-soft text-ink'}`}>
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Icon name={status.icon} size={20} />
              <span className="font-semibold">Application: {status.label}.</span>
              <span className="min-w-0 flex-1">{status.summary}</span>
              <Link href="/application" className="link font-semibold">View application</Link>
            </div>
          </div>
        )}
        <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <div className="hidden w-72 shrink-0 bg-primary lg:block" />
      <div className="h-16 bg-primary lg:hidden" />
      <div role="status" aria-label="Loading" className="flex-1 space-y-4 px-4 py-10 sm:px-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
