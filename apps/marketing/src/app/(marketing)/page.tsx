import Link from 'next/link';
import { CtaBand } from '@/components/marketing/cta-band';
import { NetworkDiagram } from '@/components/marketing/network-diagram';
import { PricingTable } from '@/components/marketing/pricing-table';
import { Steps } from '@/components/marketing/steps';
import { MeetUgi } from '@/components/marketing/meet-ugi';
import { WalletPreview } from '@/components/marketing/wallet-preview';
import { ButtonLink, Container, Icon, Ugi, type IconName } from '@ugnaya/web-ui';
import { Section } from '@/components/ui/section';
import { FOUNDING, PLANS } from '@/lib/plans';
import { CTA_CUSTOMER, CTA_MERCHANT, TAGLINE, TAGLINE_FIL } from '@/lib/site';

type Item = { icon: IconName; title: string; body: string };

const MADE_FOR: { icon: IconName; label: string }[] = [
  { icon: 'local_cafe', label: 'Cafés and coffee shops' },
  { icon: 'emoji_food_beverage', label: 'Milk tea and dessert shops' },
  { icon: 'restaurant', label: 'Restaurants and eateries' },
  { icon: 'fiber_new', label: 'Newly opened food businesses' },
];

const PROBLEMS: Item[] = [
  { icon: 'receipt_long', title: 'Lost cards', body: 'Customers start over at zero, or never start at all.' },
  { icon: 'groups', title: 'Anonymous regulars', body: 'You can’t thank, remind or win back people you don’t know.' },
  { icon: 'storefront', title: 'New shops start cold', body: 'Opening buzz fades fast without a reason to come back.' },
];

const FOR_BUSINESSES: Item[] = [
  { icon: 'loyalty', title: 'Your own loyalty program', body: 'Points or stamps, your rewards, your rules. Ready in minutes from a café, milk tea or restaurant template.' },
  { icon: 'groups', title: 'Know your regulars', body: 'See who visits, how often, and who hasn’t been back in a while.' },
  { icon: 'campaign', title: 'Bring them back', body: 'Birthday rewards, double-points days and win-back messages.' },
  { icon: 'qr_code_scanner', title: 'No new hardware', body: 'A phone or tablet scans the QR. Your cashier is trained in minutes.' },
  { icon: 'analytics', title: 'Proof it works', body: 'A monthly report of visits, return rate and rewards given, in your own numbers.' },
];

const FOR_CUSTOMERS: Item[] = [
  { icon: 'qr_code_2', title: 'One QR code', body: 'No more wallet full of stamp cards.' },
  { icon: 'redeem', title: 'Rewards you can reach', body: 'See exactly how many points to your next treat.' },
  { icon: 'explore', title: 'Discover new places', body: 'Find cafés and restaurants near you, and welcome offers from new ones.' },
];

/** A list with hairlines between rows: structure without a card around every item. */
function DividedList({ items }: { items: Item[] }) {
  return (
    <ul className="divide-y divide-divider border-y border-divider">
      {items.map((item) => (
        <li key={item.title} className="flex gap-4 py-5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon name={item.icon} />
          </span>
          <div>
            <h3 className="font-sans font-semibold">{item.title}</h3>
            <p className="mt-1 text-ink-muted">{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <>
      <section className="gradient-wash pb-16 pt-12 sm:pt-20">
        <Container className="grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              For cafés, milk tea shops and restaurants
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-4xl lg:text-6xl">{TAGLINE}</h1>
            <p className="mt-3 text-lg font-medium text-ink-muted" lang="fil">
              {TAGLINE_FIL}
            </p>
            <p className="mt-6 max-w-xl text-lg text-ink-muted">
              A digital loyalty card your customers carry for every shop they love. You bring your regulars back, and
              customers from the shops around you discover you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={CTA_MERCHANT.href} size="lg" variant="reward">
                {CTA_MERCHANT.label}
                <Icon name="arrow_forward" size={20} />
              </ButtonLink>
              <ButtonLink href={CTA_CUSTOMER.href} size="lg" variant="secondary">
                {CTA_CUSTOMER.label}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-muted">Free to start. No new hardware: a phone at the counter is enough.</p>
          </div>
          {/* Ugi stands beside the wallet, never over it: overlapping, his navy glove merged into the phone's dark frame and
              looked cut off. Sized to the gap each width leaves; below 1024 px there is no gap, and Meet Ugi shows him instead. */}
          <div className="relative mx-auto w-full max-w-[300px]">
            <WalletPreview />
            <div className="pointer-events-none absolute bottom-0 -left-[106px] hidden lg:block xl:hidden">
              <Ugi pose="default" height={120} alt="Ugi, the UGNAYA Assistant, waving hello" />
            </div>
            <div className="pointer-events-none absolute bottom-0 -left-[158px] hidden xl:block">
              <Ugi pose="default" height={180} priority alt="Ugi, the UGNAYA Assistant, waving hello" />
            </div>
          </div>
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

      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-12 lg:gap-16">
          <header>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">The problem</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your regulars are your business. Paper stamp cards don’t keep them.</h2>
            <p className="mt-4 text-lg text-ink-muted">
              Cards get lost, stamps get faked, and you never learn who your best customers are or when they stopped coming.
            </p>
          </header>
          <DividedList items={PROBLEMS} />
        </Container>
      </section>

      <Section tone="card" eyebrow="How it works" title="Ten seconds at the counter" intro="One QR code in the customer’s phone works at every UGNAYA shop.">
        <Steps
          steps={[
            { icon: 'qr_code_2', title: 'Scan', body: 'The customer shows their UGNAYA QR, or gives their mobile number. No app needed to start.' },
            { icon: 'stars', title: 'Earn', body: 'Your cashier types the amount. Points land in the customer’s wallet straight away.' },
            { icon: 'redeem', title: 'Redeem', body: 'When they have enough, they pick a reward you set, like a free upsize. One scan and it’s done.' },
          ]}
        />
        <p className="mt-8">
          <Link href="/how-it-works" className="font-semibold link">
            See both sides of the counter
          </Link>
        </p>
      </Section>

      <MeetUgi />

      <section className="py-16 sm:py-20">
        <Container className="grid items-center gap-12 md:grid-cols-2 lg:gap-16">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">The rewards network</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">A network of neighbours, not another punch card</h2>
            <p className="mt-4 text-lg text-ink-muted">
              Every shop runs its own rewards. Customers carry one wallet for all of them, and find nearby UGNAYA
              shops in the directory, so the café next door can send you a regular, and you can send one back.
            </p>
          </div>
          <NetworkDiagram />
        </Container>
      </section>

      <section className="border-t border-border bg-card py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">For businesses</p>
            <h2 className="text-3xl font-bold tracking-tight">Everything a chain has, at the price of a few cups a day</h2>
            <div className="mt-8">
              <DividedList items={FOR_BUSINESSES} />
            </div>
            <div className="mt-8">
              <ButtonLink href="/for-businesses" variant="secondary">
                More for businesses
              </ButtonLink>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">For customers</p>
            <h2 className="text-3xl font-bold tracking-tight">One wallet for the places you already love</h2>
            <div className="mt-8">
              <DividedList items={FOR_CUSTOMERS} />
            </div>
            <div className="mt-8">
              <ButtonLink href="/for-customers" variant="secondary">
                More for customers
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <Section
        eyebrow="Pricing"
        title="Start free. Upgrade when it pays for itself."
        intro="A café keeps about ₱90 from a ₱150 order, so Starter pays for itself with five extra visits a month."
      >
        <PricingTable plans={PLANS.slice(0, 4)} compact />
        <p className="mt-6">
          <Link href="/pricing" className="font-semibold link">
            Compare every plan, including Enterprise
          </Link>
        </p>
      </Section>

      <CtaBand
        illustration={<Ugi pose="celebrating" height={190} />}
        title="Be one of our founding merchants"
        body={`A ${FOUNDING.pilotDays}-day free pilot, free setup and cashier training, a QR kit for your counter, and ${FOUNDING.discountPercent}% off for ${FOUNDING.months} months after.`}
        primary={CTA_MERCHANT}
        secondary={{ label: 'How the program works', href: '/for-businesses#founding' }}
      />
    </>
  );
}
