import type { ReactNode } from 'react';
import { Suspense } from 'react';
import type { IconName } from '@ugnaya/web-ui';
import { Skeleton } from '@ugnaya/web-ui';
import { PortalNav, type NavGroup } from '@/components/portal-nav';
import { requireAdmin } from '@/lib/admin';
import { callAdmin } from '@/lib/rpc';
import type { Alerts } from '@/lib/types';

type Module = { href: string; label: string; icon: IconName; anyOf?: string[]; badge?: (a: Alerts) => number; badgeLabel?: string };

// Every module, grouped. A module is listed only when the role holds one of its permissions (`anyOf`). That is
// convenience, not security: each page calls requireAdmin(permission) and the database checks every query again.
const GROUPS: { label: string; modules: Module[] }[] = [
  {
    label: 'Operations',
    modules: [
      { href: '/', label: 'Overview', icon: 'dashboard' },
      { href: '/applications', label: 'Applications', icon: 'how_to_reg', anyOf: ['merchants.view'],
        badge: (a) => a.new_applications + a.answers_received, badgeLabel: 'new applications and answers waiting' },
      { href: '/merchants', label: 'Merchants', icon: 'storefront', anyOf: ['merchants.view'] },
      { href: '/users', label: 'Users', icon: 'groups', anyOf: ['users.view'] },
      { href: '/transactions', label: 'Transactions', icon: 'receipt_long', anyOf: ['transactions.view'],
        badge: (a) => a.open_fraud_flags, badgeLabel: 'open fraud flags' },
    ],
  },
  {
    label: 'Finance',
    modules: [
      { href: '/revenue', label: 'Revenue', icon: 'payments', anyOf: ['finance.view'] },
      { href: '/subscriptions', label: 'Subscriptions', icon: 'workspace_premium', anyOf: ['subscriptions.view'] },
    ],
  },
  {
    label: 'Insights',
    modules: [
      { href: '/analytics', label: 'Analytics', icon: 'analytics', anyOf: ['analytics.view'] },
      { href: '/reports', label: 'Reports & exports', icon: 'download', anyOf: ['reports.view', 'reports.export', 'finance.export'] },
    ],
  },
  {
    label: 'Platform',
    modules: [
      { href: '/settings', label: 'Settings', icon: 'settings', anyOf: ['settings.manage'] },
      { href: '/team', label: 'Team', icon: 'admin_panel_settings', anyOf: ['admins.manage'] },
      { href: '/audit', label: 'Audit log', icon: 'history', anyOf: ['audit.view'] },
      { href: '/account', label: 'Account', icon: 'person' },
    ],
  },
];

export default function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-8 w-48" /></div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const holds = (m: Module) => !m.anyOf || m.anyOf.some((p) => admin.permissions.includes(p));
  // The badges are a hint; if the alerts can't be read (no permission, or the function isn't deployed) the menu still works.
  const alerts = admin.permissions.includes('notifications.view') ? await callAdmin<Alerts>('admin_alerts') : null;
  const groups: NavGroup[] = GROUPS.map((g) => ({
    label: g.label,
    items: g.modules.filter(holds).map((m) => ({
      href: m.href, label: m.label, icon: m.icon, badgeLabel: m.badgeLabel,
      badge: m.badge && alerts?.ok ? m.badge(alerts.data) : undefined,
    })),
  })).filter((g) => g.items.length > 0);
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <PortalNav groups={groups} role={admin.role} email={admin.email} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
