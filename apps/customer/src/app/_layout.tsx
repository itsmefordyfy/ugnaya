import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { headerCloseOptions } from '@/components/header-close-button';
import { LoadingState } from '@/components/ui/state-view';
import { useProfileFor } from '@/api/profile';
import { AuthProvider, useAuth } from '@/api/session';
import { AppGate, type GateReason } from '@/features/auth';
import { configureNotificationHandler } from '@/lib/push';
import { PushSync } from '@/features/notifications';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStackHeaderOptions } from '@/hooks/use-stack-header-options';
import { useTheme } from '@/hooks/use-theme';
import { errorCode } from '@/lib/errors';
import { closeScreen } from '@/lib/navigation';
import { supabaseConfigured } from '@/lib/supabase';
import { makeScreenPresets } from '@/navigation/presets';

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

// Server reads: fresh for 30 s, re-read when the app comes back to the front; a dropped connection is retried twice, a refused
// request never (its code is the answer).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: (count, error) => count < 2 && errorCode(error) === 'network', refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => subscription.remove();
});

/** Where the person is: signed out, signing up (the profile step), in the app, or one of the states with no way in. */
type Phase = 'loading' | 'signedOut' | 'onboarding' | 'app' | GateReason;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function usePhase(): { phase: Phase; retry: () => void } {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.userId : null;
  const profile = useProfileFor(userId);
  const retry = () => void profile.refetch();
  if (!supabaseConfigured) return { phase: 'misconfigured', retry };
  if (auth.status === 'loading') return { phase: 'loading', retry };
  if (auth.status === 'signedOut') return { phase: 'signedOut', retry };
  if (profile.data === undefined) return { phase: profile.isError ? 'profileError' : 'loading', retry };
  if (!profile.data || profile.data.deleted_at) return { phase: 'notCustomer', retry };
  return { phase: profile.data.onboarded_at ? 'app' : 'onboarding', retry };
}

function AppNavigator() {
  const colorScheme = useColorScheme();
  const colors = useTheme();
  const headerOptions = useStackHeaderOptions();
  const presets = makeScreenPresets(colors);
  const { phase, retry } = usePhase();
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: { ...baseTheme.colors, primary: colors.primaryText, background: colors.background, card: colors.background, text: colors.text, border: colors.border },
  };

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);
  // The splash stays until we know which screen to open, so a signed-in customer never sees the welcome flash by.
  const [splashHidden, setSplashHidden] = useState(false);
  useEffect(() => {
    if (phase !== 'loading' && !splashHidden) void SplashScreen.hideAsync().finally(() => setSplashHidden(true));
  }, [phase, splashHidden]);

  // First launch: the splash covers this. Later (just signed in, the profile on its way): a quiet page, not a blank one.
  if (phase === 'loading') return splashHidden ? <LoadingState /> : null;

  const sheet = (title: string) => ({ ...presets.pageSheet(title), ...headerCloseOptions({ onPress: closeScreen }) });

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="auto" />
      {phase === 'misconfigured' || phase === 'profileError' || phase === 'notCustomer' ? (
        <AppGate reason={phase} onRetry={retry} />
      ) : (
        <Stack screenOptions={headerOptions}>
          <Stack.Protected guard={phase === 'signedOut'}>
            {/* "/" when signed out (the tabs' "/" is guarded off), so a cold start opens the welcome. */}
            <Stack.Screen name="(auth)/index" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={presets.push('Sign in')} />
            <Stack.Screen name="sign-up" options={presets.push('Create account')} />
            <Stack.Screen name="forgot-password" options={sheet('Reset password')} />
          </Stack.Protected>
          <Stack.Protected guard={phase === 'onboarding'}>
            <Stack.Screen name="profile-setup" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack.Protected>
          <Stack.Protected guard={phase === 'app'}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="scanner" options={presets.fullScreen()} />
            <Stack.Screen name="merchant/[id]" options={presets.push('')} />
            <Stack.Screen name="rewards/index" options={presets.push('Rewards')} />
            <Stack.Screen name="rewards/[id]" options={presets.push('Reward')} />
            <Stack.Screen name="voucher" options={{ ...presets.fullScreen(), gestureEnabled: false }} />
            <Stack.Screen name="vouchers" options={presets.push('My vouchers')} />
            <Stack.Screen name="activity/index" options={presets.push('Activity')} />
            <Stack.Screen name="activity/[id]" options={presets.push('Transaction')} />
            <Stack.Screen name="wallet/[accountId]" options={presets.push('')} />
            <Stack.Screen name="notifications" options={presets.push('Notifications')} />
            <Stack.Screen name="settings/profile" options={sheet('Edit profile')} />
            <Stack.Screen name="settings/notifications" options={presets.push('Notifications')} />
            <Stack.Screen name="settings/password" options={sheet('Change password')} />
            <Stack.Screen name="settings/privacy" options={presets.push('Privacy & data')} />
            <Stack.Screen name="settings/help" options={presets.push('Help & support')} />
          </Stack.Protected>
          {/* The reset link can arrive signed in or out, and exchanging its code signs the person in: always reachable. */}
          <Stack.Screen name="reset-password" options={sheet('New password')} />
        </Stack>
      )}
      {phase === 'app' && <PushSync />}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
