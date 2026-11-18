import type { ReactNode } from 'react';
import { Icon, Logo, Ugi } from '@ugnaya/web-ui';
import { MARKETING_LINKS } from '@/lib/urls';

const PROMISES = ['One free wallet for every UGNAYA shop', 'Earn points everywhere you already go', 'Rewards you can actually reach'];

/**
 * Sign-in and registration. On a phone: the form alone. From 1024 px: a brand panel with Ugi beside the form, the
 * form centred against it. The logo is the way back to the public site (ugnaya.com).
 */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center px-4 sm:px-6">
          <a href={MARKETING_LINKS.home} aria-label="UGNAYA, go to the home page">
            <Logo height={34} />
          </a>
        </div>
      </header>
      <main id="main" className="flex-1">
        <div className="mx-auto grid w-full max-w-[1180px] gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:items-center">
          <aside aria-hidden="true" className="gradient-brand relative hidden min-h-[560px] overflow-hidden rounded-xl p-10 text-on-gradient shadow-lg lg:block">
            <p className="font-display text-3xl font-extrabold leading-tight tracking-tight">One Wallet.<br />More Places.<br />More Rewards.</p>
            <ul className="mt-8 space-y-3">
              {PROMISES.map((p) => (
                <li key={p} className="flex items-center gap-3 font-medium">
                  <Icon name="check_circle" size={22} />
                  {p}
                </li>
              ))}
            </ul>
            <div className="absolute -bottom-2 right-8">
              <Ugi pose="default" height={280} priority />
            </div>
          </aside>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </main>
    </>
  );
}
