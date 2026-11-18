'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Badge, Icon, Logo, type IconName } from '@ugnaya/web-ui';

export type NavItem = { href: string; label: string; icon: IconName; badge?: number; badgeLabel?: string };
export type NavGroup = { label: string; items: NavItem[] };

const isActive = (href: string, pathname: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

/** Grouped sidebar from 1024 px; a top bar with a menu below it. Only modules the role holds are passed in. */
export function PortalNav({ groups, role, email }: { groups: NavGroup[]; role: string; email: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const attention = groups.flatMap((g) => g.items).reduce((sum, i) => sum + (i.badge ?? 0), 0);

  const list = (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}
                    className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium ${active ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-primary-soft hover:text-ink'}`}>
                    <Icon name={item.icon} size={20} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="tabular rounded-pill bg-reward px-2 py-0.5 text-xs font-semibold text-on-reward" aria-label={item.badgeLabel ?? `${item.badge} need attention`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-border pt-4">
      <p className="truncate text-sm font-medium">{email}</p>
      <p className="text-xs text-ink-muted">{role.replace('_', ' ')}</p>
      <form action="/logout" method="post" className="mt-2">
        <button type="submit" className="link inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><Icon name="logout" size={18} />Sign out</button>
      </form>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-card p-4 lg:flex">
        <div className="flex items-center gap-2 px-1">
          <Logo height={30} />
          <Badge tone="accent">Admin</Badge>
        </div>
        {list}
        <div className="mt-auto">{account}</div>
      </aside>
      <header className="sticky top-0 z-40 border-b border-border bg-card lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo height={28} />
            <Badge tone="accent">Admin</Badge>
          </div>
          <button type="button" aria-expanded={open} aria-controls="admin-menu" aria-label={open ? 'Close menu' : attention ? `Open menu, ${attention} items need attention` : 'Open menu'}
            onClick={() => setOpen((v) => !v)} className="relative inline-flex size-11 items-center justify-center rounded-pill">
            <Icon name={open ? 'close' : 'menu'} />
            {!open && attention > 0 && <span aria-hidden="true" className="absolute right-2 top-2 size-2.5 rounded-pill bg-reward" />}
          </button>
        </div>
        {open && (
          <div id="admin-menu" className="max-h-[calc(100dvh-3.5rem)] space-y-4 overflow-y-auto border-t border-border p-4">
            {list}
            {account}
          </div>
        )}
      </header>
    </>
  );
}
