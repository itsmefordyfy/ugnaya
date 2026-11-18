'use client';

import { useState } from 'react';
import type { Plan } from '@/lib/plans';
import { PricingTable, type BillingCycle } from './pricing-table';

/** The pricing page's plans with a Monthly / Yearly switch (yearly = two months free). */
export function PricingPlans({ plans }: { plans: Plan[] }) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const option = (value: BillingCycle, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={cycle === value}
      onClick={() => setCycle(value)}
      className={`min-h-11 rounded-pill px-5 text-sm font-semibold transition ${cycle === value ? 'bg-primary text-on-primary shadow-sm' : 'text-ink-muted hover:text-ink'}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div role="radiogroup" aria-label="Billing period" className="mb-8 inline-flex rounded-pill border border-border bg-card p-1">
        {option('monthly', 'Monthly')}
        {option('yearly', 'Yearly · 2 months free')}
      </div>
      <PricingTable plans={plans} cycle={cycle} />
    </div>
  );
}
