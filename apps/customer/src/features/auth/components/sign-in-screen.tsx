import { isEmail } from '@ugnaya/rules';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PasswordField } from '@/components/password-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import { tapFeedback } from '@/lib/haptics';

import { signIn } from '../api';

/** Email and password. Success flips the root guard, which opens the app (or the profile step for a new member). */
export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const emailError = submitted && !isEmail(email.trim()) ? 'Enter the email you signed up with.' : null;
  const passwordError = submitted && password.length === 0 ? 'Enter your password.' : null;

  const submit = async () => {
    setSubmitted(true);
    setFailure(null);
    if (!isEmail(email.trim()) || password.length === 0) return;
    tapFeedback();
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setFailure(errorMessage(error));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Sign in" loading={busy} onPress={() => void submit()} />}>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Welcome back
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          Sign in to see your points and rewards.
        </ThemedText>
      </View>
      {failure && <Notice tone="danger" message={failure} />}
      <View style={styles.fields}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="email"
          returnKeyType="next"
          error={emailError}
        />
        <PasswordField label="Password" purpose="current" value={password} onChangeText={setPassword} returnKeyType="go" onSubmitEditing={() => void submit()} error={passwordError} />
        <Button title="Forgot password?" variant="ghost" size="small" onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })} style={styles.forgot} />
      </View>
      <View style={styles.switch}>
        <ThemedText type="secondary" themeColor="textSecondary">
          New to UGNAYA?
        </ThemedText>
        <Button title="Create an account" variant="ghost" size="small" onPress={() => router.replace('/sign-up')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: Spacing.one,
  },
  fields: {
    gap: Spacing.three,
  },
  forgot: {
    alignSelf: 'flex-start',
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
