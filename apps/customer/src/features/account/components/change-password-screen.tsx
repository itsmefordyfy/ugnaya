import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PasswordField } from '@/components/password-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { updatePassword, verifyPassword, MIN_PASSWORD } from '@/features/auth';
import { useMyEmail } from '@/api/session';
import { errorCode, errorMessage } from '@/lib/errors';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import { closeScreen } from '@/lib/navigation';

/** The current password first (so an unlocked phone can't change it), then the new one twice. */
export function ChangePasswordScreen() {
  const email = useMyEmail();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [wrongCurrent, setWrongCurrent] = useState(false);

  const errors = {
    current: current.length === 0 ? 'Enter your current password.' : wrongCurrent ? 'That isn’t your current password.' : null,
    password: password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : password === current ? 'Choose a password different from the current one.' : null,
    confirm: confirm !== password ? 'The two passwords don’t match.' : null,
  };

  const save = async () => {
    setSubmitted(true);
    setFailure(null);
    if (errors.current || errors.password || errors.confirm || !email) return;
    tapFeedback();
    setBusy(true);
    try {
      await verifyPassword(email, current);
      await updatePassword(password);
      successFeedback();
      closeScreen();
    } catch (error) {
      if (errorCode(error) === 'wrong_password') setWrongCurrent(true);
      else setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Change password" loading={busy} onPress={() => void save()} />}>
      {failure && <Notice tone="danger" message={failure} />}
      <View style={styles.fields}>
        <PasswordField
          label="Current password"
          purpose="current"
          value={current}
          onChangeText={(value) => {
            setCurrent(value);
            setWrongCurrent(false);
          }}
          error={submitted ? errors.current : null}
        />
        <PasswordField label="New password" purpose="new" value={password} onChangeText={setPassword} hint={`At least ${MIN_PASSWORD} characters.`} error={submitted ? errors.password : null} />
        <PasswordField label="Confirm new password" purpose="new" value={confirm} onChangeText={setConfirm} error={submitted ? errors.confirm : null} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        Forgot your current password? Sign out, then use Forgot password on the sign-in screen.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: Spacing.three,
  },
});
