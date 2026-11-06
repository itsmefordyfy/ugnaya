import { ButtonLink } from '@/components/ui/button-link';
import { Container } from '@/components/ui/container';
import { Logo } from '@/components/ui/logo';
import { CTA_CUSTOMER, CTA_MERCHANT, TAGLINE, TAGLINE_FIL } from '@/lib/site';

export default function Home() {
  return (
    <Container className="py-24">
      <Logo size={64} />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">{TAGLINE}</h1>
      <p className="mt-2 text-lg text-ink-muted">{TAGLINE_FIL}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={CTA_MERCHANT.href} size="lg">{CTA_MERCHANT.label}</ButtonLink>
        <ButtonLink href={CTA_CUSTOMER.href} size="lg" variant="secondary">{CTA_CUSTOMER.label}</ButtonLink>
      </div>
    </Container>
  );
}
