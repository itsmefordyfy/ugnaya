import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Linking, StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SettingsGroup } from '@/components/ui/settings-group';
import { ErrorState, LoadingState } from '@/components/ui/state-view';
import { Toggle } from '@/components/ui/toggle';
import { Spacing } from '@/constants/theme';
import { askAndRegister, pushProjectId } from '@/lib/push';
import { errorMessage } from '@/lib/errors';
import { tapFeedback } from '@/lib/haptics';

import { useProfile, useUpdateProfile } from '@/api/profile';

type Pref = 'notify_points' | 'notify_offers' | 'notify_expiry';

const PREFS: { key: Pref; title: string; subtitle: string }[] = [
  { key: 'notify_points', title: 'Points and rewards', subtitle: 'When you earn points, redeem a reward, or a shop corrects a visit.' },
  { key: 'notify_expiry', title: 'Expiring points', subtitle: 'Before points expire, and when they do.' },
  { key: 'notify_offers', title: 'Offers', subtitle: 'Promotions from shops you visit. Never more than a few a month.' },
];

/**
 * What the customer wants to hear about (saved on their profile, so the backend's push sender respects it on every phone), and
 * whether this phone may show notifications at all (the system's permission, with a way to Settings).
 */
export function NotificationSettingsScreen() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const permission = useQuery({ queryKey: ['push-permission'], queryFn: () => Notifications.getPermissionsAsync() });

  if (profile.isPending) return <LoadingState />;
  if (!profile.data) return <ErrorState message={profile.isError ? errorMessage(profile.error) : undefined} onRetry={() => void profile.refetch()} />;
  const data = profile.data;
  const status = permission.data?.status;

  return (
    <Screen>
      {status && status !== 'granted' && (
        <View style={styles.notice}>
          <Notice tone="info" message={status === 'denied' ? 'Notifications are off for UGNAYA in your phone’s Settings. You’ll still see everything in the app.' : 'Allow notifications to hear about points as they arrive.'} />
        </View>
      )}
      {status && status !== 'granted' && (
        <SettingsGroup>
          {status === 'denied' ? (
            <ListRow title="Open Settings" icon="settings" onPress={() => void Linking.openSettings()} />
          ) : (
            <ListRow
              title="Allow notifications"
              icon="notifications_active"
              onPress={() => {
                tapFeedback();
                void askAndRegister().finally(() => void permission.refetch());
              }}
            />
          )}
        </SettingsGroup>
      )}
      <SettingsGroup title="Tell me about" footer={pushProjectId() ? undefined : 'Push messages start once this build is set up for them; until then everything shows in Notifications in the app.'}>
        {PREFS.map((pref) => {
          const value = update.isPending && update.variables[pref.key] !== undefined ? !!update.variables[pref.key] : data[pref.key];
          return (
            <ListRow
              key={pref.key}
              title={pref.title}
              subtitle={pref.subtitle}
              trailing={<Toggle value={value} accessibilityLabel={pref.title} onValueChange={(next) => update.mutate({ [pref.key]: next })} />}
            />
          );
        })}
      </SettingsGroup>
      {update.isError && <Notice tone="danger" message={errorMessage(update.error)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: Spacing.two,
  },
});
