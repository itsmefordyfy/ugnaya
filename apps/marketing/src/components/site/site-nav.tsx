'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CTA_GET_STARTED, CTA_SIGN_IN, NAV } from '@/lib/site';
import { Icon, Logo, buttonClasses } from '@ugnaya/web-ui';

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  // Close the menu after navigating (adjusting state while rendering, not in an effect).
  if (open && openedAt !== pathname) {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="UGNAYA, home" className="shrink-0">
          <Logo height={36} />
        </Link>
        <div className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-ink-muted hover:text-ink aria-[current=page]:text-primary"
            >
              {item.label}
            </Link>
          ))}
          <Link href={CTA_SIGN_IN.href} className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-ink-muted hover:text-ink">
            Sign in
          </Link>
          <Link href={CTA_GET_STARTED.href} className={`${buttonClasses('primary')} whitespace-nowrap`}>
            {CTA_GET_STARTED.label}
          </Link>
        </div>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-pill lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => {
            setOpen(!open);
            setOpenedAt(pathname);
          }}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-border bg-card lg:hidden">
          <ul className="mx-auto max-w-[1180px] px-4 py-2">
            {[...NAV, CTA_SIGN_IN].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className="flex min-h-11 items-center text-base font-medium aria-[current=page]:text-primary"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="py-3">
              <Link href={CTA_GET_STARTED.href} className={`${buttonClasses('primary', 'lg')} w-full`} onClick={() => setOpen(false)}>
                {CTA_GET_STARTED.label}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
