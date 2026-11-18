import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader, Panel } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { defaultHours, readHours } from '@/lib/hours';
import { createClient } from '@/lib/supabase/server';
import { BranchForm } from '../_components/branch-form';

export const metadata: Metadata = { title: 'Edit branch' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default function EditBranchPage({ params }: PageProps<'/branches/[id]'>) {
  return (
    <Suspense fallback={<><Skeleton className="mb-8 h-9 w-56" /><Skeleton className="h-[40rem] w-full" /></>}>
      <EditBranch params={params} />
    </Suspense>
  );
}

async function EditBranch({ params }: Pick<PageProps<'/branches/[id]'>, 'params'>) {
  const { id } = await params;
  const ctx = await requireStaff('branches');
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('merchant_branches')
    .select('id, name, address, city, lat, lng, hours, active')
    .eq('id', id)
    .eq('merchant_id', ctx.merchant.id)
    .maybeSingle();
  if (error) return <><PageHeader title="Edit branch" /><DataError message={friendlyError(error)} /></>;
  if (!data) notFound();
  return (
    <>
      <PageHeader title={`Edit ${data.name}`} />
      <Panel>
        <BranchForm values={{ ...data, lat: data.lat === null ? null : Number(data.lat), lng: data.lng === null ? null : Number(data.lng), hours: readHours(data.hours) ?? defaultHours() }} />
      </Panel>
    </>
  );
}
