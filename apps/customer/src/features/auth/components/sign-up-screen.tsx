import { isEmail } from '@ugnaya/rules';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CheckRow } from '@/components/check-row';
import { PasswordField } from '@/components/password-field';
import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import { openPrivacy, openTerms } from '@/lib/links';

import { signUp } from '../api';

export const MIN_PASSWORD = 8;

/**
 * A customer account: name, email, password and the terms. The database makes the member profile and id. With email
 * confirmation on (not today), it says to check the inbox instead of opening the app.
 */
export function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const errors = {
    name: name.trim().length < 2 ? 'Enter your name.' : null,
    email: !isEmail(email.trim()) ? 'Enter a valid email address.' : null,
    password: password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : null,
    terms: !agreed ? 'Agree to the terms to continue.' : null,
  };
  const valid = Object.values(errors).every((error) => error === null);

  const submit = async () => {
    setSubmitted(true);
    setFailure(null);
    if (!valid) return;
    tapFeedback();
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp(name, email, password);
      if (needsConfirmation) {
        successFeedback();
        setCheckEmail(true);
      }
      // Otherwise the session arrives and the root guard opens the profile step.
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (checkEmail) {
    return (
      <Screen footer={<Button title="Go to sign in" onPress={() => router.replace('/sign-in')} />} contentStyle={styles.centered}>
        <Ugi pose="wink" size={160} />
        <ThemedText type="title" style={styles.center} accessibilityRole="header">
          Check your email
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
          {`We sent a link to ${email.trim()}. Open it to confirm your account, then sign in.`}
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Create account" loading={busy} onPress={() => void submit()} />}>
      <View style={styles.intro}>
        <ThemedText type="title" accessibilityRole="header">
          Join UGNAYA
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          One free account for points at every participating shop.
        </ThemedText>
      </View>
      {failure && <Notice tone="danger" message={failure} />}
      <View style={styles.fields}>
        <TextField label="Your name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" autoComplete="name" maxLength={80} error={submitted ? errors.name : null} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="email"
          error={submitted ? errors.email : null}
        />
        <PasswordField label="Password" purpose="new" value={password} onChangeText={setPassword} hint={`At least ${MIN_PASSWORD} characters.`} error={submitted ? errors.password : null} />
      </View>
      <View style={styles.consent}>
        <CheckRow checked={agreed} onChange={setAgreed} accessibilityLabel="I agree to the Terms of Service and Privacy Policy" error={submitted && !agreed}>
          <ThemedText type="secondary">
            I agree to the{' '}
            <ThemedText type="secondarySemiBold" themeColor="primary" onPress={openTerms} accessibilityRole="link">
              Terms of Service
            </ThemedText>{' '}
            and{' '}
            <ThemedText type="secondarySemiBold" themeColor="primary" onPress={openPrivacy} accessibilityRole="link">
              Privacy Policy
            </ThemedText>
            .
          </ThemedText>
        </CheckRow>
        {submitted && errors.terms && (
          <ThemedText type="caption" themeColor="danger">
            {errors.terms}
          </ThemedText>
        )}
      </View>
      <View style={styles.switch}>
        <ThemedText type="secondary" themeColor="textSecondary">
          Already a member?
        </ThemedText>
        <Button title="Sign in" variant="ghost" size="small" onPress={() => router.replace('/sign-in')} />
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
  consent: {
    gap: Spacing.one,
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
