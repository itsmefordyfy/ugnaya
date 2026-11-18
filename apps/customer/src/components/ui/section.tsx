import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type SectionProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Another control at the end of the header, after the text action (an add button). */
  trailing?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** A titled block of a screen, with an optional text action at the end of its header ("See all"). */
export function Section({ title, actionLabel, onAction, trailing, children, style }: SectionProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <ThemedText type="section" accessibilityRole="header" style={styles.title}>
          {title}
        </ThemedText>
        {((actionLabel && onAction) || trailing) && (
          <View style={styles.actions}>
            {actionLabel && onAction && (
              <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
                <ThemedText type="secondarySemiBold" themeColor="primary">
                  {actionLabel}
                </ThemedText>
              </Pressable>
            )}
            {trailing}
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  // Wraps, so with large text or a long translation the action drops under the title instead of running off the edge.
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
  },
  title: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
