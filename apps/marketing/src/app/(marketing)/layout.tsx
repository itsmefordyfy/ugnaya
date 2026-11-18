import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteNav } from '@/components/site/site-nav';
import { CONTACT_EMAIL, DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

// Structured data (schema.org) so search results can show the organisation. `<` is escaped so the JSON can never end the script tag.
const STRUCTURED_DATA = JSON.stringify([
  { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: SITE_URL, email: CONTACT_EMAIL, logo: `${SITE_URL}/brand/png/logo-horizontal-2000.png` },
  { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, description: DESCRIPTION },
]).replace(/</g, '\\u003c');

/** The public pages: the site's navigation and footer around them. */
export default function MarketingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }} />
      <SiteNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
