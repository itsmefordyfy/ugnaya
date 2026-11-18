import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PasswordField } from '@/components/password-field';
import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { LoadingState } from '@/components/ui/state-view';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import { successFeedback, tapFeedback } from '@/lib/haptics';

import { exchangeResetCode, updatePassword } from '../api';
import { useAuth } from '@/api/session';
import { MIN_PASSWORD } from './sign-up-screen';

type Step = 'exchanging' | 'form' | 'invalid' | 'done';

/**
 * Where the reset email's link lands (ugnaya://reset-password?code=…). The one-time code becomes a session on this phone, then
 * the person picks a new password. A link opened on another phone, or used twice, can't be exchanged: it says so.
 */
export function ResetPasswordScreen() {
  const { code, error_description: linkError } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const auth = useAuth();
  const [step, setStep] = useState<Step>(code ? 'exchanging' : auth.status === 'signedIn' ? 'form' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const exchanged = useRef(false);

  useEffect(() => {
    if (!code || exchanged.current) return;
    exchanged.current = true;
    exchangeResetCode(code).then(
      () => setStep('form'),
      () => setStep('invalid'),
    );
  }, [code]);

  const errors = {
    password: password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : null,
    confirm: confirm !== password ? 'The two passwords don’t match.' : null,
  };

  const submit = async () => {
    setSubmitted(true);
    setFailure(null);
    if (errors.password || errors.confirm) return;
    tapFeedback();
    setBusy(true);
    try {
      await updatePassword(password);
      successFeedback();
      setStep('done');
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const leave = () => router.replace('/');

  if (step === 'exchanging') return <LoadingState />;

  if (step === 'invalid' || step === 'done') {
    const done = step === 'done';
    return (
      <Screen footer={<Button title={done ? 'Continue' : 'Close'} onPress={leave} />} contentStyle={styles.centered}>
        <Ugi pose={done ? 'celebrating' : 'thinking'} size={140} />
        <ThemedText type="section" style={styles.center} accessibilityRole="header">
          {done ? 'Password changed' : 'This link can’t be used'}
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
          {done
            ? 'Your new password is set. Use it next time you sign in.'
            : (linkError ?? 'Reset links work once, for a short time, on the phone that asked for them. Ask for a new one from Sign in → Forgot password.')}
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Save new password" loading={busy} onPress={() => void submit()} />}>
      <ThemedText type="body" themeColor="textSecondary">
        Choose a new password for your UGNAYA account.
      </ThemedText>
      {failure && <Notice tone="danger" message={failure} />}
      <View style={styles.fields}>
        <PasswordField label="New password" purpose="new" value={password} onChangeText={setPassword} autoFocus error={submitted ? errors.password : null} hint={`At least ${MIN_PASSWORD} characters.`} />
        <PasswordField label="Confirm new password" purpose="new" value={confirm} onChangeText={setConfirm} error={submitted ? errors.confirm : null} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: Spacing.three,
  },
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
