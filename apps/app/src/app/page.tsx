import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { getAccount, getViewer } from '@/lib/auth/session';
import { destinationFor } from '@/lib/auth/roles';
import { urls } from '@/lib/urls';

/** The front door: sends each signed-in account to the right place for its role (visitors are redirected to sign-in by the proxy). */
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
  const account = await getAccount(viewer.id);
  redirect(destinationFor(account.role, urls));
}
