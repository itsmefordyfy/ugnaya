import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { homePath } from '@/lib/auth/access';
import { getMembership, getViewer } from '@/lib/auth/session';

/** The front door: each signed-in person goes to their start page (visitors are redirected to sign-in by the proxy). */
export default function Home() {
  return (
    <main id="main" className="mx-auto w-full max-w-md px-4 py-16">
      <Suspense fallback={<Skeleton className="h-8 w-48" />}>
        <RoleRouter />
      </Suspense>
    </main>
  );
}

async function RoleRouter(): Promise<never> {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const membership = await getMembership(viewer.id);
  // Signed in but not on any business's staff yet: register one (an invited person opens their invitation link instead).
  if (!membership) redirect('/register');
  redirect(homePath(membership.role, membership.merchant.status));
}
