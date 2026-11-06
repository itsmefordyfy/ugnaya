import Link from 'next/link';
import { CONTACT_EMAIL, NAV } from '@/lib/site';
import { Container } from '@/components/ui/container';
import { Logo } from '@/components/ui/logo';

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
      <Container className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo wordmark />
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            A shared loyalty wallet for independent cafés, milk tea shops and restaurants, starting in Naga City.
          </p>
          <p className="mt-4 text-sm text-ink-muted">
            <a className="hover:text-ink" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <FooterLinks title="UGNAYA" links={NAV} />
        <FooterLinks title="Company" links={LEGAL} />
      </Container>
      <Container className="mt-10 text-xs text-ink-muted">
        <p>Fordytech Solutions · Naga City, Camarines Sur, Philippines</p>
      </Container>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-ink-muted hover:text-ink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
