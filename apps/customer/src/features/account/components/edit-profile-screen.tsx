import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/state-view';
import { errorMessage } from '@/lib/errors';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import { closeScreen } from '@/lib/navigation';

import { isValid, profileColumns, validateProfile, type ProfileDraft } from '../profile-form';
import { useProfile, useUpdateProfile } from '@/api/profile';
import type { CustomerProfile } from '@/api/types';
import { ProfileFields } from './profile-fields';

/** Edit profile: the same fields as the sign-up step. Marketing consent keeps its original time unless it's switched on anew. */
export function EditProfileScreen() {
  const profile = useProfile();
  if (profile.isPending) return <LoadingState />;
  if (!profile.data) return <ErrorState message={profile.isError ? errorMessage(profile.error) : undefined} onRetry={() => void profile.refetch()} />;
  return <EditProfileForm profile={profile.data} />;
}

function EditProfileForm({ profile }: { profile: CustomerProfile }) {
  const update = useUpdateProfile();
  const [draft, setDraft] = useState<ProfileDraft>({
    name: profile.display_name ?? '',
    month: profile.birthday_month,
    day: profile.birthday_day ? String(profile.birthday_day) : '',
    city: profile.city ?? '',
    marketing: !!profile.marketing_consent_at,
  });
  const [submitted, setSubmitted] = useState(false);
  const errors = validateProfile(draft);

  const save = () => {
    setSubmitted(true);
    if (!isValid(errors)) return;
    tapFeedback();
    const marketing_consent_at = draft.marketing ? (profile.marketing_consent_at ?? new Date().toISOString()) : null;
    update.mutate(
      { ...profileColumns(draft), marketing_consent_at },
      {
        onSuccess: () => {
          successFeedback();
          closeScreen();
        },
      },
    );
  };

  return (
    <Screen footer={<Button title="Save" loading={update.isPending} onPress={save} />}>
      {update.isError && <Notice tone="danger" message={errorMessage(update.error)} />}
      <ProfileFields draft={draft} onChange={(changes) => setDraft((current) => ({ ...current, ...changes }))} errors={submitted ? errors : null} />
    </Screen>
  );
}
