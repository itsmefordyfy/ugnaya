import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteNav } from '@/components/site/site-nav';

/** The public pages: the site's navigation and footer around them. */
export default function MarketingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
