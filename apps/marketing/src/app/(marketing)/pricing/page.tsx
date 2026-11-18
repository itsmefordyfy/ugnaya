import type { Metadata } from 'next';
import Link from 'next/link';
import { EnterpriseCard } from '@/components/marketing/enterprise-card';
import { PlanComparison } from '@/components/marketing/plan-comparison';
import { PricingPlans } from '@/components/marketing/pricing-plans';
import { Section } from '@/components/ui/section';
import { FOUNDING, PLANS } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'UGNAYA plans for independent businesses: Free, Starter ₱399, Growth ₱899 and Business ₱1,999 a month. Founding merchants get 40% off.',
};

const SELF_SERVE = PLANS.filter((p) => p.code !== 'enterprise');
const ENTERPRISE = PLANS.find((p) => p.code === 'enterprise');

export default function Pricing() {
  return (
    <>
      <Section eyebrow="Pricing" title="Simple plans that pay for themselves" intro="Start free. Pay monthly, or yearly with two months free. Cancel any time; your customers keep their points.">
        <PricingPlans plans={SELF_SERVE} />
        {ENTERPRISE && <EnterpriseCard plan={ENTERPRISE} />}
      </Section>
      <Section tone="card" eyebrow="Founding merchants" title={`${FOUNDING.discountPercent}% off for your first ${FOUNDING.months} months`}>
        <p className="max-w-2xl text-lg text-ink-muted">
          The first 20 shops get a {FOUNDING.pilotDays}-day free pilot, then {FOUNDING.discountPercent}% off their plan for {FOUNDING.months} months, with
          free setup and a QR kit.{' '}
          <Link href="/for-businesses#founding" className="font-semibold link">
            About the program
          </Link>
        </p>
      </Section>
      <Section eyebrow="Compare" title="Plan limits side by side">
        <PlanComparison plans={PLANS} />
        <p className="mt-6 max-w-2xl text-sm text-ink-muted">
          Prices are in Philippine pesos for the pilot period and may change; founding merchants keep theirs for {FOUNDING.months} months. Text messages
          for campaigns are charged at cost; app notifications are free.
        </p>
      </Section>
    </>
  );
}
