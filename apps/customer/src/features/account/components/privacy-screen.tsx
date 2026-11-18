import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { SettingsGroup } from '@/components/ui/settings-group';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth';
import { useMe } from '@/api/session';
import { errorMessage } from '@/lib/errors';
import { emailSupport, openPrivacy } from '@/lib/links';
import { rpc } from '@/lib/supabase';

const KEPT = [
  'Your name, email, optional birthday (month and day) and city.',
  'Your points, visits and vouchers at each shop, so balances add up.',
  'This phone’s notification token, if you allowed notifications.',
];

/**
 * What UGNAYA keeps and why, the privacy policy, a data request by email, and deleting the account (App Store 5.1.1(v)):
 * personal details are erased and the sign-in closed for good; the points history stays, without the person, because the
 * shops' ledgers must still add up (the database function delete_my_account).
 */
export function PrivacyScreen() {
  const me = useMe();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await rpc<null>('delete_my_account');
      await signOut(queryClient, me);
    } catch (error) {
      setFailure(errorMessage(error));
      setBusy(false);
    }
  };

  const confirm = () =>
    Alert.alert(
      'Delete your UGNAYA account?',
      'Your name, email, birthday and favorites are erased, unused vouchers are cancelled, and all your points are lost. You can’t undo this or sign in again with this account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'This is permanent.', [
              { text: 'Keep my account', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => void remove() },
            ]),
        },
      ],
    );

  return (
    <Screen>
      <Card style={styles.card}>
        <ThemedText type="heading">What UGNAYA keeps</ThemedText>
        {KEPT.map((line) => (
          <ThemedText key={line} type="secondary" themeColor="textSecondary">
            {`•  ${line}`}
          </ThemedText>
        ))}
        <ThemedText type="secondary" themeColor="textSecondary">
          Shops see your name and your visits with them, never your email or other shops. Your location is used on the phone to sort shops and is never stored.
        </ThemedText>
      </Card>
      <SettingsGroup>
        <ListRow title="Privacy Policy" icon="policy" onPress={openPrivacy} />
        <ListRow title="Ask for a copy of your data" icon="download" onPress={() => emailSupport('Data request')} />
      </SettingsGroup>
      <View style={styles.danger}>
        <ThemedText type="section">Delete account</ThemedText>
        <ThemedText type="secondary" themeColor="textSecondary">
          Erases your personal details and closes your account for good. Points can’t be moved or refunded.
        </ThemedText>
        {failure && <Notice tone="danger" message={failure} />}
        <Button title="Delete my account" variant="danger" icon="delete" loading={busy} onPress={confirm} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  danger: {
    gap: Spacing.two,
  },
});
