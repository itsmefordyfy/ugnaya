import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SettingsGroup } from '@/components/ui/settings-group';
import { Radius, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth';
import { useMe, useMyEmail } from '@/api/session';
import { spacedMemberId } from '@/components/member-card';
import { useTheme } from '@/hooks/use-theme';
import { emailSupport, openPrivacy, openTerms } from '@/lib/links';

import { useProfile } from '@/api/profile';

function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0]?.slice(0, 2) ?? 'U')).toUpperCase();
}

/** Account: who's signed in, profile and preferences, help, the legal pages, sign out. */
export function AccountScreen() {
  const me = useMe();
  const email = useMyEmail();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const [signingOut, setSigningOut] = useState(false);
  const name = profile.data?.display_name;

  const confirmSignOut = () =>
    Alert.alert('Sign out of UGNAYA?', 'Your points stay in your account. Sign in again to see them.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          setSigningOut(true);
          void signOut(queryClient, me).finally(() => setSigningOut(false));
        },
      },
    ]);

  return (
    <Screen variant="tab">
      <TabHeader title="Account" />
      <Card style={styles.profile} onPress={() => router.push('/settings/profile')} accessibilityLabel={`${name ?? 'Your profile'}, ${email ?? ''}. Edit profile`}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText type="heading" style={{ color: theme.onPrimary }}>
            {initials(name)}
          </ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText type="heading" numberOfLines={1}>
            {name ?? 'Your profile'}
          </ThemedText>
          {email && (
            <ThemedText type="secondary" themeColor="textSecondary" numberOfLines={1}>
              {email}
            </ThemedText>
          )}
          {profile.data?.public_member_id && (
            <ThemedText type="caption" themeColor="textSecondary" tabular>
              {`Member ID ${spacedMemberId(profile.data.public_member_id)}`}
            </ThemedText>
          )}
        </View>
      </Card>

      <SettingsGroup title="Settings">
        <ListRow title="Edit profile" icon="person" onPress={() => router.push('/settings/profile')} />
        <ListRow title="Notifications" icon="notifications" onPress={() => router.push('/settings/notifications')} />
        <ListRow title="Change password" icon="key" onPress={() => router.push('/settings/password')} />
        <ListRow title="Privacy & data" icon="shield_person" onPress={() => router.push('/settings/privacy')} />
      </SettingsGroup>

      <SettingsGroup title="Your points">
        <ListRow title="Activity" icon="receipt_long" onPress={() => router.push('/activity')} />
        <ListRow title="My vouchers" icon="confirmation_number" onPress={() => router.push('/vouchers')} />
        <ListRow title="Rewards" icon="redeem" onPress={() => router.push('/rewards')} />
      </SettingsGroup>

      <SettingsGroup title="Help">
        <ListRow title="Help & support" icon="help" onPress={() => router.push('/settings/help')} />
        <ListRow title="Email us" icon="mail" onPress={() => emailSupport()} />
        <ListRow title="Terms of Service" icon="description" onPress={openTerms} />
        <ListRow title="Privacy Policy" icon="policy" onPress={openPrivacy} />
      </SettingsGroup>

      <Button title="Sign out" variant="outline" icon="logout" loading={signingOut} onPress={confirmSignOut} />
      <ThemedText type="caption" themeColor="textTertiary" style={styles.version}>
        {`UGNAYA ${Constants.expoConfig?.version ?? ''}`}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
  version: {
    textAlign: 'center',
  },
});
