import type { Metadata } from 'next';
import { Section } from '@/components/ui/section';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: 'UGNAYA is a shared loyalty wallet for independent shops, made by Fordytech Solutions.',
};

export default function About() {
  return (
    <Section eyebrow="About" title="Built to connect independent shops">
      <div className="max-w-2xl space-y-5 text-lg text-ink-muted">
        <p>
          <em>Ugnay</em> means to connect. UGNAYA connects the independent cafés, milk tea shops and restaurants
          with their customers, and with each other, so a regular at one shop becomes a welcome visitor at the next.
        </p>
        <p>
          Chains have had loyalty apps for years. The neighbourhood café has had a paper stamp card. We want every independent
          shop to have the repeat-customer tools only chains have today, at a price that pays for itself in a few extra visits.
        </p>
        <p>
          UGNAYA is made by Fordytech Solutions, a small software studio that also builds the CarMind, Pawfetti,
          Ulamin and Bubblie apps.
        </p>
        <p>
          Get in touch:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold link">
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </Section>
  );
}
