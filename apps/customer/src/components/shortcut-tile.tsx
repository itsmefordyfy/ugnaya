import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { MinTouchSize, Radius, Spacing, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

export type ShortcutTileProps = { icon: IconName; label: string; tone?: Tone; onPress: () => void };

/** A quick link as a tile (Wallet's Activity, Vouchers, Rewards): one of a row of equal tiles. */
export function ShortcutTile({ icon, label, tone = 'navy', onPress }: ShortcutTileProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { backgroundColor: theme.backgroundElement, borderColor: theme.border, boxShadow: theme.shadowCard }, pressed && styles.pressed]}>
      <IconTile icon={icon} tone={tone} size={40} />
      <ThemedText type="secondarySemiBold" numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: MinTouchSize * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
