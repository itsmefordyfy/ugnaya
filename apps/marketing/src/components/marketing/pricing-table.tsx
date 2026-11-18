import Link from 'next/link';
import { Badge, Icon, buttonClasses } from '@ugnaya/web-ui';
import { formatPeso, type Plan } from '@/lib/plans';
import { CTA_MERCHANT } from '@/lib/site';

export type BillingCycle = 'monthly' | 'yearly';

export type PricingTableProps = {
  plans: Plan[];
  /** Short cards for the home page: no limits or feature lists. */
  compact?: boolean;
  cycle?: BillingCycle;
};

const limit = (value: number | null, noun: string) => (value === null ? `Unlimited ${noun}` : `${value} ${noun}`);

/** The price block: the same two lines on every card, so the cards line up. */
function Price({ plan, cycle }: { plan: Plan; cycle: BillingCycle }) {
  const monthly = plan.priceCentavos ?? 0;
  const yearly = cycle === 'yearly' && monthly > 0;
  return (
    <div>
      <p className="whitespace-nowrap">
        <span className="tabular text-4xl font-extrabold tracking-tight">{formatPeso(yearly ? monthly * 10 : monthly)}</span>
        <span className="text-ink-muted"> / {yearly ? 'year' : 'month'}</span>
      </p>
      <p className="mt-1 min-h-5 text-sm text-ink-muted">
        {monthly === 0 ? 'Free, for good' : yearly ? 'Two months free' : <>or <span className="tabular">{formatPeso(monthly * 10)}</span> a year</>}
      </p>
    </div>
  );
}

/**
 * The plan cards. Each card is a subgrid row-span, so every row (name, price, description, limits, features, button)
 * lines up across the cards whatever the text length. The highlighted plan's badge sits on the card's top edge.
 */
export function PricingTable({ plans, compact = false, cycle = 'monthly' }: PricingTableProps) {
  const rows = compact ? 'row-span-4' : 'row-span-6';
  return (
    <ul className="grid gap-x-5 gap-y-8 pt-3 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => (
        <li
          key={plan.code}
          className={`relative grid grid-rows-subgrid gap-4 rounded-lg border bg-card p-6 ${rows} ${
            plan.highlight ? 'border-primary shadow-md ring-1 ring-primary' : 'border-border'
          }`}
        >
          {plan.highlight && <Badge tone="reward" className="absolute -top-3 left-6">Most popular</Badge>}
          <h3 className="font-sans text-lg font-semibold">{plan.name}</h3>
          <Price plan={plan} cycle={cycle} />
          <p className="text-sm text-ink-muted">{plan.blurb}</p>
          {!compact && (
            <>
              <p className="border-t border-divider pt-4 text-sm font-medium">
                {limit(plan.branches, plan.branches === 1 ? 'branch' : 'branches')} · {limit(plan.staff, 'staff')}
                {plan.transactionsPerMonth !== null && <> · {plan.transactionsPerMonth} transactions a month</>}
              </p>
              <ul className="space-y-2.5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-success-text" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link href={CTA_MERCHANT.href} className={`${buttonClasses(plan.highlight ? 'primary' : 'secondary')} w-full self-end`}>
            {plan.code === 'free' ? 'Start free' : `Choose ${plan.name}`}
          </Link>
        </li>
      ))}
    </ul>
  );
}
