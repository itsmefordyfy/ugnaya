import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';

export type FormActionsProps = ViewProps;

/**
 * A form's buttons in its footer: Save first, then Delete or Remove. The wide gap keeps the
 * destructive button clearly apart, so a hurried tap on Save never lands on Delete.
 */
export function FormActions({ style, ...rest }: FormActionsProps) {
  return <View style={[styles.actions, style]} {...rest} />;
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.three,
  },
});
