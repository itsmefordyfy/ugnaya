import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader, Panel } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { canEditDocuments } from '@/lib/application';
import { friendlyError } from '@/lib/errors';
import { logoUrl } from '@/lib/storage';
import { createClient } from '@/lib/supabase/server';
import { LogoUpload } from './_components/logo-upload';
import { ProfileForm } from './_components/profile-form';

export const metadata: Metadata = { title: 'Business profile' };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Business profile" description="How your business appears in the UGNAYA app, and how we reach you. Editable at any time, before and after approval." />
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const ctx = await requireStaff('profile');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('merchants')
    .select('trade_name, legal_name, description, address, city, contact_email, contact_phone, website, owner_mobile, logo_path')
    .eq('id', ctx.merchant.id)
    .single();
  if (error) return <DataError message={friendlyError(error)} />;
  return (
    <div className="space-y-6">
      <Panel title="Logo">
        <LogoUpload merchantId={ctx.merchant.id} tradeName={data.trade_name} url={logoUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, data.logo_path)} />
      </Panel>
      <Panel title="Details">
        <ProfileForm values={data} readOnly={false} nameLocked={!canEditDocuments(ctx.merchant.status)} />
      </Panel>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading the profile" className="space-y-6">
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-[28rem] w-full" />
    </div>
  );
}
