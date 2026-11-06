import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/logo';

/** Sign-in and sign-up: a slim header, nothing to wander off to. */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="UGNAYA, home">
            <Logo wordmark />
          </Link>
          <Link href="/" className="text-sm font-medium text-ink-muted hover:text-ink">
            Back to the site
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1 px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </>
  );
}
