import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

export type EmptyStateProps = {
  icon?: IconName;
  /** A picture in place of the icon. */
  illustration?: ReactNode;
  title: string;
  message?: string;
  /** The next step, as a button: every empty state says what to do. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * An empty screen's content: icon or illustration, title, message and the next step. Always centered
 * in the space it's given (owner's rule, 2026-10-23): it grows to fill that space, so the screen or
 * list holding it must let its content grow (`Screen contentStyle`, a FlatList's `contentContainerStyle`: `flexGrow: 1`).
 */
export function EmptyState({ icon, illustration, title, message, action, style }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, style]}>
      {illustration ??
        (icon && (
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <Icon name={icon} size={28} color="primary" />
          </View>
        ))}
      <ThemedText type="section" style={styles.center}>
        {title}
      </ThemedText>
      {message && (
        <ThemedText type="secondary" themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: 420,
    alignSelf: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
});
