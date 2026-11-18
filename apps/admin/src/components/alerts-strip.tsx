import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@ugnaya/web-ui';
import { formatCount } from '@/lib/format';
import type { Alerts } from '@/lib/types';
import { LocalTime } from './local-time';

/** What needs an administrator now, each linking to its queue. Nothing to do reads as such, not as an empty box. */
export function AlertsStrip({ alerts }: { alerts: Alerts }) {
  const all: { n: number; label: string; href: string; icon: IconName; extra?: ReactNode }[] = [
    { n: alerts.new_applications, label: 'new applications', href: '/applications?status=pending_verification', icon: 'fiber_new',
      extra: alerts.oldest_application_at ? <>oldest from <LocalTime iso={alerts.oldest_application_at} mode="date" /></> : null },
    { n: alerts.answers_received, label: 'owners answered your questions', href: '/applications?status=under_review', icon: 'mail' },
    { n: alerts.awaiting_review, label: 'under review', href: '/applications?status=under_review', icon: 'pending' },
    { n: alerts.waiting_on_merchant, label: 'waiting on the business', href: '/applications?status=info_required', icon: 'schedule' },
    { n: alerts.open_fraud_flags, label: 'open fraud flags', href: '/transactions?tab=flags', icon: 'flag' },
    { n: alerts.ledger_mismatches, label: 'ledger mismatches (balances that don’t match the ledger)', href: '/transactions', icon: 'gpp_maybe' },
  ];
  const items = all.filter((i) => i.n > 0);

  if (items.length === 0) {
    return (
      <p className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-ink-muted">
        <Icon name="task_alt" size={20} className="text-success-text" /> Nothing needs your attention right now.
      </p>
    );
  }
  return (
    <section aria-label="Needs attention" className="mb-6 rounded-lg border border-warning bg-warning-soft p-3">
      <ul className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-2">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-warning-text hover:bg-card">
              <Icon name={i.icon} size={18} />
              <span><strong className="tabular">{formatCount(i.n)}</strong> {i.label}{i.extra && <span className="text-xs"> · {i.extra}</span>}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
