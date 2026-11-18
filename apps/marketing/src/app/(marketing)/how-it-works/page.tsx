import type { Metadata } from 'next';
import { Ugi } from '@ugnaya/web-ui';
import { CtaBand } from '@/components/marketing/cta-band';
import { Steps } from '@/components/marketing/steps';
import { PhoneMockup } from '@/components/ui/phone-mockup';
import { Section } from '@/components/ui/section';
import { CTA_MERCHANT } from '@/lib/site';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'How customers earn and redeem UGNAYA points, and what your cashier does at the counter: about ten seconds a customer.',
};

export default function HowItWorks() {
  return (
    <>
      <Section
        eyebrow="How it works"
        title="Both sides of the counter"
        intro="Customers carry one QR code. Your cashier scans it, types the amount, and the points are there before the receipt prints."
      />

      <Section tone="card" eyebrow="For customers" title="Join, earn, redeem">
        <div className="grid items-start gap-12 lg:grid-cols-[1.4fr_1fr]">
          <Steps
            steps={[
              { icon: 'qr_code_scanner', title: 'Join in a minute', body: 'Scan the standee at the counter for a wallet in your browser, or download the app. Your mobile number is enough.' },
              { icon: 'stars', title: 'Earn at every shop', body: 'Show your QR, or give your number. Each shop’s points show on its own card in your wallet.' },
              { icon: 'redeem', title: 'Redeem a reward', body: 'Pick a reward, show the one-time QR, and the cashier hands it over.' },
            ]}
          />
          <PhoneMockup title="Free upsize" lines={['40 points', 'Show this code at Kape ni Juan', 'Valid for 5 minutes', 'Used once, then gone']} />
        </div>
      </Section>

      <Section eyebrow="For your cashier" title="Scan, type, confirm">
        <div className="grid items-start gap-12 lg:grid-cols-[1.4fr_1fr]">
          <Steps
            steps={[
              { icon: 'lock', title: 'Unlock with a PIN', body: 'The shop’s tablet or phone stays signed in. Each cashier unlocks it with their own PIN, so you know who did what.' },
              { icon: 'qr_code_scanner', title: 'Scan the customer', body: 'Scan the QR or type the mobile number. The customer’s name shows so you know it’s them.' },
              { icon: 'check_circle', title: 'Type the amount', body: 'UGNAYA works out the points. Confirm, and the customer sees them land on their phone.' },
            ]}
          />
          <PhoneMockup title="Award points" lines={['Maria C. · member AB2CD3EF', 'Amount: ₱200.00', '+20 points', 'Confirm']} />
        </div>
        <div className="mt-10">
          <ul className="grid gap-3 text-ink-muted sm:grid-cols-2">
            <li>• A wrong amount? The cashier can void it the same shift; the owner can fix older ones.</li>
            <li>• Lost connection? Retrying never awards twice.</li>
            <li>• Each reward QR works once and expires in five minutes.</li>
            <li>• Points have no cash value: they’re a thank-you, not money.</li>
          </ul>
        </div>
      </Section>

      <CtaBand
        illustration={<Ugi pose="helpful" height={190} />}
        title="See it at your counter"
        body="We’ll visit, set it up with you and train your staff. It takes about an hour."
        primary={CTA_MERCHANT}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  );
}
