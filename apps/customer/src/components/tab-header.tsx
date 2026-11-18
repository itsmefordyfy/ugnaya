import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type TabHeaderProps = {
  title: string;
  eyebrow?: string;
  /** A line under the title, e.g. today's date under Home's greeting. */
  subtitle?: string;
  /** Right-aligned actions such as the settings gear. */
  accessory?: ReactNode;
};

/** In-content large title for tab roots, which have no native header. */
export function TabHeader({ title, eyebrow, subtitle, accessory }: TabHeaderProps) {
  return (
    <View style={styles.header}>
      {eyebrow && (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.eyebrow}>
          {eyebrow}
        </ThemedText>
      )}
      {/* The buttons share the title's row, so they sit level with the title on every tab, whether
          or not a line (Home's date) comes under it. */}
      <View style={styles.titleRow}>
        <ThemedText type="title" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
          {title}
        </ThemedText>
        {accessory}
      </View>
      {subtitle && (
        <ThemedText type="secondary" themeColor="textSecondary" numberOfLines={1}>
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    flex: 1,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
