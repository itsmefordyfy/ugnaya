import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Logo } from '@/components/ui/logo';
import { getViewer } from '@/lib/auth/session';

export const metadata: Metadata = { robots: { index: false } };

/** The signed-in merchant area: its own header; each page checks the session itself. */
export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/app" aria-label="UGNAYA, your account">
            <Logo wordmark />
          </Link>
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      <main id="main" className="flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </>
  );
}

async function AccountMenu() {
  const viewer = await getViewer();
  if (!viewer) return null;
  return (
    <div className="flex items-center gap-4">
      <span className="hidden text-sm text-ink-muted sm:inline">{viewer.name ?? viewer.email}</span>
      <form action="/logout" method="post">
        <button type="submit" className="min-h-11 text-sm font-semibold text-primary hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
