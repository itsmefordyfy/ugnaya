import type { Metadata } from 'next';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { ButtonLink, Container } from '@ugnaya/web-ui';
import { PhoneMockup } from '@/components/ui/phone-mockup';
import { Section } from '@/components/ui/section';
import { CTA_CUSTOMER_ACCOUNT } from '@/lib/site';
import { WaitlistForm } from './_components/waitlist-form';

export const metadata: Metadata = {
  title: 'For customers',
  description: 'One QR code for every UGNAYA café, milk tea shop and restaurant. Join the waitlist for the app.',
};

export default function ForCustomers() {
  return (
    <>
      <Section eyebrow="For customers" title="One wallet. Every shop you love." intro="Earn points at the cafés, milk tea shops and restaurants you already visit, and spend them on rewards you can actually reach.">
        <div className="grid items-start gap-12 lg:grid-cols-[1.4fr_1fr]">
          <FeatureGrid
            columns={2}
            items={[
              { icon: 'qr_code_2', title: 'One QR code', body: 'Show it at any UGNAYA shop, or just give your mobile number.' },
              { icon: 'stars', title: 'Points at every shop', body: 'Each shop’s card shows your points and how close you are to a reward.' },
              { icon: 'redeem', title: 'Real rewards', body: 'Free upsizes, desserts and discounts, set by the shops themselves.' },
              { icon: 'explore', title: 'Discover new places', body: 'Welcome offers from new cafés and restaurants near you.' },
              { icon: 'notifications', title: 'Never miss a reward', body: 'A nudge when a reward unlocks, and before points expire.' },
              { icon: 'shield', title: 'Your data, your choice', body: 'Shops see only your visits with them. Delete your account any time.' },
            ]}
          />
          <PhoneMockup title="Kape ni Juan" lines={['120 points', 'Free pastry at 120 ✓', 'Free upsize at 40 ✓', 'Last visit: yesterday']} />
        </div>
      </Section>

      <section id="waitlist" className="bg-card py-16">
        <Container>
          <h2 className="text-3xl font-bold tracking-tight">Join the waitlist</h2>
          <p className="mt-3 max-w-xl text-lg text-ink-muted">
            The UGNAYA app is coming soon. Leave your email or mobile number and we’ll tell you when it’s ready.
          </p>
          <div className="mt-8">
            <WaitlistForm />
          </div>
          <p className="mt-8 max-w-xl text-ink-muted">
            Want your member ID now? You can already create your UGNAYA account; your wallet fills in as shops join.
          </p>
          <div className="mt-4">
            <ButtonLink href={CTA_CUSTOMER_ACCOUNT.href} variant="secondary">
              {CTA_CUSTOMER_ACCOUNT.label}
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
