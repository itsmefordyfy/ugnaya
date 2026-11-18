import { isEmail } from '@ugnaya/rules';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/errors';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import { closeScreen } from '@/lib/navigation';

import { requestPasswordReset } from '../api';

/**
 * Sends the reset email. Its link opens the app (ugnaya://reset-password) on this phone, where a new password is set. The
 * answer is the same whether or not the email has an account, so the screen never reveals who is a member.
 */
export function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const emailError = submitted && !isEmail(email.trim()) ? 'Enter a valid email address.' : null;

  const submit = async () => {
    setSubmitted(true);
    setFailure(null);
    if (!isEmail(email.trim())) return;
    tapFeedback();
    setBusy(true);
    try {
      await requestPasswordReset(email);
      successFeedback();
      setSent(true);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen footer={<Button title="Done" onPress={closeScreen} />} contentStyle={styles.centered}>
        <Ugi pose="wink" size={140} />
        <ThemedText type="section" style={styles.center} accessibilityRole="header">
          Check your email
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
          {`If ${email.trim()} has a UGNAYA account, we sent a link to set a new password. Open it on this phone.`}
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Send reset link" loading={busy} onPress={() => void submit()} />}>
      <ThemedText type="body" themeColor="textSecondary">
        Enter the email you use for UGNAYA. We’ll send you a link to choose a new password.
      </ThemedText>
      {failure && <Notice tone="danger" message={failure} />}
      <View>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="email"
          autoFocus
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
          error={emailError}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
