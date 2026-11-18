import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { Icon } from './icon';

export type FactRowProps = {
  label: string;
  value: string;
  /** Makes the row open something (a saved clinic's or shop's listing): the value in the brand color, with a chevron. */
  onPress?: () => void;
  /** What a tap opens, for screen readers. */
  accessibilityHint?: string;
};

/** One line of a details card: the label on the left, the value on the right (selectable, or a link). */
export function FactRow({ label, value, onPress, accessibilityHint }: FactRowProps) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityHint={accessibilityHint} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <ThemedText type="secondary" themeColor="textSecondary">
          {label}
        </ThemedText>
        <View style={styles.link}>
          <ThemedText type="bodySemiBold" themeColor="primaryText" style={styles.value}>
            {value}
          </ThemedText>
          <Icon name="chevron_right" size={20} color="primaryText" />
        </View>
      </Pressable>
    );
  }
  return (
    <View style={styles.row}>
      <ThemedText type="secondary" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="bodySemiBold" selectable style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
  link: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
