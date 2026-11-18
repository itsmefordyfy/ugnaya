import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { Card } from './card';

export type FormSectionProps = {
  title: string;
  /** Short helper text under the card. */
  footer?: string;
  /** False for edge-to-edge list rows instead of spaced fields. */
  padded?: boolean;
  children: ReactNode;
};

/** A titled card that groups related form fields, so long forms read as a few calm steps. */
export function FormSection({ title, footer, padded = true, children }: FormSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.title} accessibilityRole="header">
        {title}
      </ThemedText>
      <Card padded={padded}>{padded ? <View style={styles.fields}>{children}</View> : children}</Card>
      {footer && (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.three,
  },
  fields: {
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.three,
  },
});
