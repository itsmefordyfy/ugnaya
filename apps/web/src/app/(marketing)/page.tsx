import Link from 'next/link';
import { CtaBand } from '@/components/marketing/cta-band';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { PricingTable } from '@/components/marketing/pricing-table';
import { Steps } from '@/components/marketing/steps';
import { ButtonLink } from '@/components/ui/button-link';
import { Container } from '@/components/ui/container';
import { Icon } from '@/components/ui/icon';
import { PhoneMockup } from '@/components/ui/phone-mockup';
import { Section } from '@/components/ui/section';
import { FOUNDING, PLANS } from '@/lib/plans';
import { CTA_CUSTOMER, CTA_MERCHANT, TAGLINE, TAGLINE_FIL } from '@/lib/site';

const MADE_FOR = [
  { icon: 'local_cafe', label: 'Cafés and coffee shops' },
  { icon: 'emoji_food_beverage', label: 'Milk tea and dessert shops' },
  { icon: 'restaurant', label: 'Restaurants and eateries' },
  { icon: 'fiber_new', label: 'Newly opened food businesses' },
] as const;

export default function Home() {
  return (
    <>
      <section className="pb-16 pt-12 sm:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              For cafés, milk tea shops and restaurants in Naga City
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">{TAGLINE}</h1>
            <p className="mt-3 text-lg font-medium text-ink-muted" lang="fil">
              {TAGLINE_FIL}
            </p>
            <p className="mt-6 max-w-xl text-lg text-ink-muted">
              A digital loyalty card your customers carry for every shop they love. You bring your regulars back, and
              customers from the shops around you discover you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={CTA_MERCHANT.href} size="lg">
                {CTA_MERCHANT.label}
                <Icon name="arrow_forward" size={20} />
              </ButtonLink>
              <ButtonLink href={CTA_CUSTOMER.href} size="lg" variant="secondary">
                {CTA_CUSTOMER.label}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-muted">Free to start. No new hardware: a phone at the counter is enough.</p>
          </div>
          <PhoneMockup
            title="My UGNAYA wallet"
            lines={['Kape ni Juan · 120 points', 'Lola’s Kitchen · 45 points', 'Free upsize unlocked', 'Show my QR code']}
          />
        </Container>
      </section>

      <section aria-label="Who it is for" className="border-y border-border bg-card py-6">
        <Container>
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-ink-muted">
            {MADE_FOR.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <Icon name={item.icon} size={20} className="text-primary" />
                {item.label}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Section
        eyebrow="The problem"
        title="Your regulars are your business. Paper stamp cards don’t keep them."
        intro="Cards get lost, stamps get faked, and you never learn who your best customers are or when they stopped coming."
      >
        <FeatureGrid
          items={[
            { icon: 'receipt_long', title: 'Lost cards', body: 'Customers start over at zero, or never start at all.' },
            { icon: 'groups', title: 'Anonymous regulars', body: 'You can’t thank, remind or win back people you don’t know.' },
            { icon: 'storefront', title: 'New shops start cold', body: 'Opening buzz fades fast without a reason to come back.' },
          ]}
        />
      </Section>

      <Section tone="card" eyebrow="How it works" title="Ten seconds at the counter" intro="One QR code in the customer’s phone works at every UGNAYA shop.">
        <Steps
          steps={[
            { icon: 'qr_code_2', title: 'Scan', body: 'The customer shows their UGNAYA QR, or gives their mobile number. No app needed to start.' },
            { icon: 'stars', title: 'Earn', body: 'Your cashier types the amount. Points land in the customer’s wallet straight away.' },
            { icon: 'redeem', title: 'Redeem', body: 'When they have enough, they pick a reward you set, like a free upsize. One scan and it’s done.' },
          ]}
        />
        <p className="mt-8">
          <Link href="/how-it-works" className="font-semibold text-primary hover:underline">
            See both sides of the counter
          </Link>
        </p>
      </Section>

      <Section eyebrow="For businesses" title="Everything a chain has, at the price of a few cups a day">
        <FeatureGrid
          items={[
            { icon: 'loyalty', title: 'Your own loyalty program', body: 'Points or stamps, your rewards, your rules. Ready in minutes from a café, milk tea or restaurant template.' },
            { icon: 'groups', title: 'Know your regulars', body: 'See who visits, how often, and who hasn’t been back in a while.' },
            { icon: 'campaign', title: 'Bring them back', body: 'Birthday rewards, double-points days and win-back messages.' },
            { icon: 'explore', title: 'Meet the neighbours’ customers', body: 'Customers of the shops around you find you in the UGNAYA directory.' },
            { icon: 'qr_code_scanner', title: 'No new hardware', body: 'A phone or tablet scans the QR. Your cashier is trained in minutes.' },
            { icon: 'analytics', title: 'Proof it works', body: 'A monthly report of visits, return rate and rewards given, in your own numbers.' },
          ]}
        />
        <div className="mt-10">
          <ButtonLink href="/for-businesses" variant="secondary">
            More for businesses
          </ButtonLink>
        </div>
      </Section>

      <Section tone="card" eyebrow="For customers" title="One wallet for the places you already love">
        <FeatureGrid
          items={[
            { icon: 'qr_code_2', title: 'One QR code', body: 'No more wallet full of stamp cards.' },
            { icon: 'redeem', title: 'Rewards you can reach', body: 'See exactly how many points to your next treat.' },
            { icon: 'explore', title: 'Discover new places', body: 'Find cafés and restaurants near you, and welcome offers from new ones.' },
          ]}
        />
      </Section>

      <Section
        eyebrow="Pricing"
        title="Start free. Upgrade when it pays for itself."
        intro="A café keeps about ₱90 from a ₱150 order, so Starter pays for itself with five extra visits a month."
      >
        <PricingTable plans={PLANS.slice(0, 4)} compact />
        <p className="mt-6">
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            Compare every plan, including Enterprise
          </Link>
        </p>
      </Section>

      <CtaBand
        title="Be one of Naga’s founding merchants"
        body={`A ${FOUNDING.pilotDays}-day free pilot, free setup and cashier training, a QR kit for your counter, and ${FOUNDING.discountPercent}% off for ${FOUNDING.months} months after.`}
        primary={CTA_MERCHANT}
        secondary={{ label: 'How the program works', href: '/for-businesses#founding' }}
      />
    </>
  );
}
