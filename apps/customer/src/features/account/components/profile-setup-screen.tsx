import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/api/session';
import { errorMessage } from '@/lib/errors';
import { successFeedback, tapFeedback } from '@/lib/haptics';

import { isValid, profileColumns, validateProfile, type ProfileDraft } from '../profile-form';
import { useProfile, useUpdateProfile } from '@/api/profile';
import { ProfileFields } from './profile-fields';

/**
 * The last sign-up step: name (from sign-up), an optional birthday and city, and the marketing choice. Saving sets
 * `onboarded_at`, which opens the app. Terms were accepted on the sign-up form; their time is recorded here, with the profile.
 */
export function ProfileSetupScreen() {
  const auth = useAuth();
  const profile = useProfile();
  const update = useUpdateProfile();
  const metaName = auth.status === 'signedIn' ? auth.session.user.user_metadata?.full_name : undefined;
  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    name: profile.data?.display_name ?? (typeof metaName === 'string' ? metaName : ''),
    month: profile.data?.birthday_month ?? null,
    day: profile.data?.birthday_day ? String(profile.data.birthday_day) : '',
    city: profile.data?.city ?? '',
    marketing: false,
  }));
  const [submitted, setSubmitted] = useState(false);
  const errors = validateProfile(draft);

  const save = () => {
    setSubmitted(true);
    if (!isValid(errors)) return;
    tapFeedback();
    const now = new Date().toISOString();
    update.mutate(
      {
        ...profileColumns(draft),
        marketing_consent_at: draft.marketing ? now : null,
        terms_accepted_at: profile.data?.terms_accepted_at ?? now,
        onboarded_at: now,
      },
      { onSuccess: successFeedback },
    );
  };

  return (
    <Screen variant="tab" footer={<Button title="Start collecting points" loading={update.isPending} onPress={save} />}>
      <View style={styles.hero}>
        <Ugi pose="happy" size={120} />
        <ThemedText type="title" style={styles.center} accessibilityRole="header">
          Nice to meet you!
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
          A few details so shops can greet you properly. Only your name is needed.
        </ThemedText>
      </View>
      {update.isError && <Notice tone="danger" message={errorMessage(update.error)} />}
      <ProfileFields draft={draft} onChange={(changes) => setDraft((current) => ({ ...current, ...changes }))} errors={submitted ? errors : null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
});
