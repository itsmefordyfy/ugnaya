import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { PageHeader, Panel } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { defaultHours } from '@/lib/hours';
import { BranchForm } from '../_components/branch-form';

export const metadata: Metadata = { title: 'Add a branch' };

export default function NewBranchPage() {
  return (
    <>
      <PageHeader title="Add a branch" />
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <NewBranch />
      </Suspense>
    </>
  );
}

async function NewBranch() {
  await requireStaff('branches');
  return (
    <Panel>
      <BranchForm values={{ id: null, name: '', address: null, city: null, lat: null, lng: null, active: true, hours: defaultHours() }} />
    </Panel>
  );
}
