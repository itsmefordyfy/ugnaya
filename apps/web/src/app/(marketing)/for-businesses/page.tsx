import type { Metadata } from 'next';
import { CtaBand } from '@/components/marketing/cta-band';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { Icon } from '@/components/ui/icon';
import { Section } from '@/components/ui/section';
import { FOUNDING } from '@/lib/plans';
import { CTA_MERCHANT } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For businesses',
  description:
    'Digital loyalty for independent cafés, milk tea shops and restaurants in Naga City: bring regulars back, meet customers of nearby shops, and see the results in your own numbers.',
};

const FOUNDING_BENEFITS = [
  `${FOUNDING.pilotDays}-day free pilot with every Growth feature`,
  `${FOUNDING.discountPercent}% off your plan for ${FOUNDING.months} months after the pilot`,
  'Free setup and cashier training at your shop',
  'A QR kit: counter standee, table tents and a door sticker',
  'Priority support straight from the founder',
  'A Founding Merchant badge in the app and directory',
  'A monthly say in what we build next',
];

const LAUNCH_PACK = [
  { icon: 'fiber_new', title: '“New in Naga” for 60 days', body: 'Top placement in the directory while your opening buzz is fresh.' },
  { icon: 'stars', title: 'Launch-week double points', body: 'A reason for first-timers to come back the next week.' },
  { icon: 'handshake', title: 'Customers from nearby shops', body: 'Your first network offer is free once shared offers launch.' },
] as const;

const WE_ASK = [
  'Ask every customer at the counter for the first two weeks',
  'Keep the QR kit where customers can see it',
  'Share a two-week baseline (how many receipts you issue)',
  'Meet us for a results review at day 45 and day 90',
];

export default function ForBusinesses() {
  return (
    <>
      <Section
        eyebrow="For businesses"
        title="More of your regulars, more often"
        intro="UGNAYA replaces the paper stamp card with something customers don’t lose, and shows you whether it works."
      >
        <FeatureGrid
          items={[
            { icon: 'loyalty', title: 'Points or stamps, your way', body: 'Per peso spent, per visit, or a classic stamp card, with rewards you choose and can afford.' },
            { icon: 'groups', title: 'Your customer list', body: 'Who your regulars are, when they last came, and who’s drifting away.' },
            { icon: 'campaign', title: 'Campaigns that bring them back', body: 'Birthday treats, double-points days, and a nudge to customers you haven’t seen in a month.' },
            { icon: 'analytics', title: 'Results in your numbers', body: 'Visits, return rate, rewards given and their cost, every month.' },
            { icon: 'shield', title: 'Fraud checks built in', body: 'Every award is tied to a cashier and a device. Unusual awards and voids are flagged.' },
            { icon: 'support_agent', title: 'A local team', body: 'We’re in Naga. We set you up in person and answer the same day.' },
          ]}
        />
      </Section>

      <Section tone="card" eyebrow="Newly opened?" title="The New Shop Launch Pack">
        <div className="grid gap-6 md:grid-cols-3">
          {LAUNCH_PACK.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-surface p-6">
              <Icon name={item.icon} className="text-primary" />
              <h3 className="mt-3 font-semibold">{item.title}</h3>
              <p className="mt-1 text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="founding" eyebrow="Founding Merchant Program" title="For the first 20 shops in Naga">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold">What you get</h3>
            <ul className="mt-4 space-y-3">
              {FOUNDING_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex gap-3">
                  <Icon name="check_circle" className="shrink-0 text-success" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">What we ask</h3>
            <ul className="mt-4 space-y-3">
              {WE_ASK.map((ask) => (
                <li key={ask} className="flex gap-3">
                  <Icon name="handshake" className="shrink-0 text-primary" />
                  <span>{ask}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="card" eyebrow="Shared loyalty" title="Customers from the shops around you" intro="Later this year, UGNAYA shops in Naga can offer a reward to customers who earned points next door. You choose the offer and how many a month; it’s like advertising you pay for only when a new customer walks in. Your own points and rewards stay yours either way." />

      <CtaBand
        title="Register your business"
        body="Tell us about your shop. We’ll verify it within one business day and visit you to set up."
        primary={CTA_MERCHANT}
        secondary={{ label: 'Read the FAQ', href: '/faq' }}
      />
    </>
  );
}
