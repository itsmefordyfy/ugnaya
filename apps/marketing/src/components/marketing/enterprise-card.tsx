import Link from 'next/link';
import { Icon, buttonClasses } from '@ugnaya/web-ui';
import type { Plan } from '@/lib/plans';

/** Enterprise is quoted, so it gets its own wide card instead of a squeezed fifth column. */
export function EnterpriseCard({ plan }: { plan: Plan }) {
  return (
    <div className="mt-8 grid gap-6 rounded-lg border border-border bg-card p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div>
        <h3 className="font-sans text-lg font-semibold">{plan.name}</h3>
        <p className="mt-1 text-ink-muted">{plan.blurb}</p>
        <ul className="mt-4 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-success-text" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:text-right">
        <p className="text-sm text-ink-muted">Priced for you</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">{plan.priceNote}<span className="text-base font-normal text-ink-muted"> / month</span></p>
        <Link href="/contact" className={`${buttonClasses('secondary')} mt-4`}>Talk to us</Link>
      </div>
    </div>
  );
}
