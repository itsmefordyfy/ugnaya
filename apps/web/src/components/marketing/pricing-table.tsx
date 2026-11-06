import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { formatPeso, type Plan } from '@/lib/plans';

export type PricingTableProps = {
  plans: Plan[];
  /** Short cards for the home page; full limits and features on /pricing. */
  compact?: boolean;
};

const limit = (value: number | null, noun: string) => (value === null ? `Unlimited ${noun}` : `${value} ${noun}`);

export function PricingTable({ plans, compact = false }: PricingTableProps) {
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 ${plans.length > 4 ? 'xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
      {plans.map((plan) => (
        <li
          key={plan.code}
          className={`flex flex-col rounded-xl border bg-card p-6 ${plan.highlight ? 'border-primary ring-2 ring-primary' : 'border-border'}`}
        >
          {plan.highlight && (
            <p className="mb-3 w-fit rounded-pill bg-reward px-3 py-1 text-xs font-semibold text-on-reward">Most popular</p>
          )}
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-2 whitespace-nowrap">
            {plan.priceCentavos === null ? (
              <span className="text-2xl font-bold">{plan.priceNote}</span>
            ) : (
              <>
                <span className="tabular text-3xl font-extrabold">{formatPeso(plan.priceCentavos)}</span>
                <span className="text-ink-muted"> / month</span>
              </>
            )}
          </p>
          {!compact && plan.priceCentavos !== null && plan.priceCentavos > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              <span className="tabular">{formatPeso(plan.priceCentavos * 10)}</span> a year (two months free)
            </p>
          )}
          <p className="mt-3 text-sm text-ink-muted">{plan.blurb}</p>
          {!compact && (
            <>
              <p className="mt-4 text-sm font-medium">
                {limit(plan.branches, plan.branches === 1 ? 'branch' : 'branches')} · {limit(plan.staff, 'staff')}
                {plan.transactionsPerMonth !== null && ` · ${plan.transactionsPerMonth} transactions a month`}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-auto pt-6">
            <Link
              href={plan.code === 'enterprise' ? '/contact' : '/register'}
              className={`${buttonClasses(plan.highlight ? 'primary' : 'secondary')} w-full`}
            >
              {plan.code === 'enterprise' ? 'Talk to us' : plan.code === 'free' ? 'Start free' : `Choose ${plan.name}`}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
