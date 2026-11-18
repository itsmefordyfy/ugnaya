'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon, Logo, type IconName } from '@ugnaya/web-ui';

export type PortalNavItem = { href: string; label: string; icon: IconName; group: string; locked: boolean };
export type PortalNavProps = {
  items: PortalNavItem[];
  business: { name: string; statusLabel: string; logoUrl: string | null };
  person: { name: string; roleLabel: string };
};

/**
 * The merchant portal's navigation: a navy sidebar from 1024 px (distinct from the admin portal's white one), and
 * below that a top bar with the business name and a drawer. The drawer is a native <dialog>, so focus is trapped and
 * restored and Esc closes it. Targets are 48 px for comfortable use on a counter tablet.
 */
export function PortalNav({ items, business, person }: PortalNavProps) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = drawer.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const groups = [...new Set(items.map((i) => i.group))];
  const list = (
    <nav aria-label="Business" className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-on-primary/70">{group}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {items.filter((i) => i.group === group).map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    // Choosing a page closes the drawer (no effect: the click is the event).
                    onClick={() => setOpen(false)}
                    className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-[15px] font-medium transition ${
                      active ? 'bg-on-primary text-primary' : 'text-on-primary/90 hover:bg-on-primary/10 hover:text-on-primary'
                    }`}
                  >
                    <Icon name={item.icon} size={22} />
                    <span className="flex-1">{item.label}</span>
                    {item.locked && <Icon name="lock" size={18} label="Locked until approval" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const header = (
    <div className="flex items-center gap-3">
      <BusinessMark name={business.name} logoUrl={business.logoUrl} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-on-primary">{business.name}</p>
        <p className="truncate text-xs text-on-primary/75">{business.statusLabel}</p>
      </div>
    </div>
  );

  const account = (
    <div className="border-t border-on-primary/20 pt-4">
      <p className="truncate text-sm font-semibold text-on-primary">{person.name}</p>
      <p className="text-xs text-on-primary/75">{person.roleLabel}</p>
      <form action="/logout" method="post" className="mt-2">
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 -ml-2 text-sm font-semibold text-on-primary hover:bg-on-primary/10">
          <Icon name="logout" size={20} />Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-8 overflow-y-auto bg-primary p-5 lg:flex">
        <Link href="/" aria-label="UGNAYA for Business, home" className="rounded-md">
          <span className="inline-flex items-center gap-2 rounded-md bg-card px-3 py-2">
            <Logo height={26} />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Business</span>
          </span>
        </Link>
        {header}
        {list}
        <div className="mt-auto">{account}</div>
      </aside>

      <header className="sticky top-0 z-40 bg-primary text-on-primary lg:hidden">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="portal-drawer"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="-ml-2 inline-flex size-12 items-center justify-center rounded-pill hover:bg-on-primary/10"
          >
            <Icon name="menu" />
          </button>
          <div className="min-w-0 flex-1">{header}</div>
        </div>
      </header>

      <dialog
        id="portal-drawer"
        ref={drawer}
        aria-label="Menu"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none overflow-y-auto bg-primary p-0 text-on-primary backdrop:bg-ink/50 lg:hidden"
      >
        <div className="flex min-h-full flex-col gap-8 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start justify-between gap-3">
            {header}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"
              className="-mr-2 -mt-1 inline-flex size-12 shrink-0 items-center justify-center rounded-pill hover:bg-on-primary/10">
              <Icon name="close" />
            </button>
          </div>
          {list}
          <div className="mt-auto">{account}</div>
        </div>
      </dialog>
    </>
  );
}

/** The business's logo, or its initial on a white tile. */
function BusinessMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    // A merchant-uploaded image from the public logos bucket; a plain img keeps Next's optimiser out of user content.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded-md bg-card object-cover" />;
  }
  return (
    <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-card font-display text-lg font-bold text-primary">
      {name.trim().charAt(0).toUpperCase() || 'U'}
    </span>
  );
}
