import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Ugi, type UgiPose } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { signOut } from '../api';
import { useAuth } from '@/api/session';

export type GateReason = 'misconfigured' | 'profileError' | 'notCustomer';

const COPY: Record<GateReason, { pose: UgiPose; title: string; message: string }> = {
  misconfigured: {
    pose: 'thinking',
    title: 'This build isn’t connected',
    message: 'The app was built without its server address. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to apps/customer/.env and rebuild.',
  },
  profileError: {
    pose: 'thinking',
    title: 'We couldn’t load your account',
    message: 'Check your connection and try again. Your points are safe.',
  },
  notCustomer: {
    pose: 'helpful',
    title: 'This isn’t a customer account',
    message: 'You signed in with a business or staff account. The UGNAYA app is for customers: sign out and create a customer account (you can use another email).',
  },
};

/** A full screen for the states with no way into the app: no server configured, the account unreadable, or not a customer. */
export function AppGate({ reason, onRetry }: { reason: GateReason; onRetry: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const copy = COPY[reason];
  const signedIn = auth.status === 'signedIn';

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.five, paddingBottom: insets.bottom + Spacing.four }]}>
      <View style={styles.content}>
        <Ugi pose={copy.pose} size={150} />
        <ThemedText type="title" style={styles.center} accessibilityRole="header">
          {copy.title}
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
          {copy.message}
        </ThemedText>
      </View>
      <View style={styles.actions}>
        {reason === 'profileError' && <Button title="Try again" onPress={onRetry} />}
        {signedIn && (
          <Button
            title="Sign out"
            variant={reason === 'profileError' ? 'secondary' : 'primary'}
            loading={busy}
            onPress={() => {
              setBusy(true);
              void signOut(queryClient, auth.userId).finally(() => setBusy(false));
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
