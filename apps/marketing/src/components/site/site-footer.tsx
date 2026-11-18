import Link from 'next/link';
import { CONTACT_EMAIL, NAV } from '@/lib/site';
import { APP_LINKS } from '@/lib/urls';
import { Container, Logo } from '@ugnaya/web-ui';

const SIGN_IN = [
  { label: 'Customers', href: APP_LINKS.signIn },
  { label: 'Businesses', href: APP_LINKS.merchantSignIn },
  { label: 'Register your business', href: APP_LINKS.registerMerchant },
];

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Merchant terms', href: '/merchant-terms' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <Container className="grid gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo height={40} />
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            A shared loyalty wallet for independent cafés, milk tea shops and restaurants.
          </p>
          <p className="mt-4 text-sm text-ink-muted">
            <a className="hover:text-ink" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <FooterLinks title="UGNAYA" links={NAV} />
        <FooterLinks title="Company" links={LEGAL} />
        <FooterLinks title="Sign in" links={SIGN_IN} />
      </Container>
      <Container className="mt-10 text-xs text-ink-muted">
        <p>Fordytech Solutions</p>
      </Container>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="inline-flex min-h-11 items-center text-sm text-ink-muted hover:text-ink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
