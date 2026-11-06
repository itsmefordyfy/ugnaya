import type { Metadata } from 'next';
import Link from 'next/link';
import { PricingTable } from '@/components/marketing/pricing-table';
import { Section } from '@/components/ui/section';
import { FOUNDING, PLANS } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'UGNAYA plans for independent businesses: Free, Starter ₱399, Growth ₱899 and Business ₱1,999 a month. Founding merchants get 40% off.',
};

export default function Pricing() {
  return (
    <>
      <Section eyebrow="Pricing" title="Simple monthly plans" intro="Start free. Pay monthly, or yearly with two months free. Cancel any time; your customers keep their points.">
        <PricingTable plans={PLANS} />
      </Section>
      <Section tone="card" title="Founding merchants in Naga">
        <p className="max-w-2xl text-lg text-ink-muted">
          The first 20 shops get a {FOUNDING.pilotDays}-day free pilot, then {FOUNDING.discountPercent}% off their plan for{' '}
          {FOUNDING.months} months, with free setup and a QR kit.{' '}
          <Link href="/for-businesses#founding" className="font-semibold text-primary hover:underline">
            About the program
          </Link>
        </p>
        <p className="mt-6 max-w-2xl text-sm text-ink-muted">
          Prices are in Philippine pesos for the pilot period and may change; founding merchants keep theirs for{' '}
          {FOUNDING.months} months. Text messages for campaigns are charged at cost; app notifications are free.
        </p>
      </Section>
    </>
  );
}
