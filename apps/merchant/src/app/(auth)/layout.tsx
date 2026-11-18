import type { ReactNode } from 'react';
import { Icon, Logo, Ugi } from '@ugnaya/web-ui';
import { MARKETING_LINKS } from '@/lib/urls';

const PROMISES = [
  'A loyalty program your customers actually use',
  'Award and redeem at the counter in seconds',
  'See who comes back, and what brings them',
];

/**
 * Sign-in, registration and invitations for businesses. On a phone: the form alone. From 1024 px: a brand panel with
 * Ugi beside the form. The logo goes back to the public site (ugnaya.com).
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-4 sm:px-6">
          <a href={MARKETING_LINKS.home} aria-label="UGNAYA, go to the home page">
            <Logo height={34} />
          </a>
          <span className="rounded-pill bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">For business</span>
        </div>
      </header>
      <main id="main" className="flex-1">
        <div className="mx-auto grid w-full max-w-[1180px] gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:items-center">
          <aside aria-hidden="true" className="gradient-brand relative hidden min-h-[560px] overflow-hidden rounded-xl p-10 text-on-gradient shadow-lg lg:block">
            <p className="font-display text-3xl font-extrabold leading-tight tracking-tight">Bring them back.<br />Reward them well.</p>
            <ul className="mt-8 space-y-3">
              {PROMISES.map((p) => (
                <li key={p} className="flex items-center gap-3 font-medium">
                  <Icon name="check_circle" size={22} />
                  {p}
                </li>
              ))}
            </ul>
            <div className="absolute -bottom-2 right-8">
              <Ugi pose="helpful" height={260} priority />
            </div>
          </aside>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </main>
    </>
  );
}
