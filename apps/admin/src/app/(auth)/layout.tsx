import type { ReactNode } from 'react';
import { Badge, Logo } from '@ugnaya/web-ui';

/** Administrator sign-in: nothing to wander off to, and no registration anywhere. The form is centred on the page. */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-4 sm:px-6">
          <Logo height={34} />
          <Badge tone="accent">Admin</Badge>
        </div>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </>
  );
}
