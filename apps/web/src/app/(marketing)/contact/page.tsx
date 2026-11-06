import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { Section } from '@/components/ui/section';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Talk to the UGNAYA team in Naga City about loyalty for your shop, Enterprise plans or partnerships.',
};

export default function Contact() {
  return (
    <Section eyebrow="Contact" title="Talk to us" intro="We’re a small team in Naga City. Email us and we’ll answer within one business day.">
      <div className="flex flex-col gap-4 sm:flex-row">
        <ButtonLink href={`mailto:${CONTACT_EMAIL}`} size="lg">
          <Icon name="mail" size={20} />
          {CONTACT_EMAIL}
        </ButtonLink>
        <ButtonLink href="/register" size="lg" variant="secondary">
          Register your business
        </ButtonLink>
      </div>
      <p className="mt-6 text-ink-muted">Enterprise plans, chains and associations: tell us how many branches you have.</p>
    </Section>
  );
}
