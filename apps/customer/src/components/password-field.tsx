import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { TextField, type TextFieldProps } from '@/components/ui/text-field';
import { IconSize, MinTouchSize } from '@/constants/theme';

export type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'trailing' | 'autoCapitalize' | 'autoCorrect'> & {
  /** `new`: iOS offers a strong password and saves it to the keychain; `current`: autofill offers the saved one. */
  purpose: 'new' | 'current';
};

/** A password with a show/hide eye, wired for Passwords autofill. */
export function PasswordField({ purpose, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...rest}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType={purpose === 'new' ? 'newPassword' : 'password'}
      autoComplete={purpose === 'new' ? 'new-password' : 'current-password'}
      passwordRules={purpose === 'new' ? 'minlength: 8;' : undefined}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((shown) => !shown)}
          hitSlop={8}
          style={styles.eye}>
          <Icon name={visible ? 'visibility_off' : 'visibility'} size={IconSize.medium} color="textSecondary" />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  eye: {
    width: MinTouchSize,
    height: MinTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
