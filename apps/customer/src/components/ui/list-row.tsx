import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSize, IconTileSize, MinTouchSize, Spacing, type ThemeColor, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTones } from '@/hooks/use-tones';

import { Icon, type IconName } from './icon';
import { useGuardedPress } from './swipe-press-guard';

export type ListRowProps = {
  title: string;
  /** Lines the title may take before it's cut (1 by default; 2 for long names like a food's). */
  titleLines?: number;
  subtitle?: string;
  /** More content under the subtitle, inside the row (a pet's feeding numbers on Log a meal). */
  detail?: ReactNode;
  icon?: IconName;
  iconColor?: ThemeColor;
  iconBackground?: ThemeColor;
  /** A category's color (a record kind, an expense category), in place of `iconColor` and `iconBackground`. */
  tone?: Tone;
  /** Custom leading content (e.g. a photo) shown instead of `icon`. */
  leading?: ReactNode;
  /** Right-aligned content such as a value or badge. */
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
  /** A choice in a list (Language, Appearance): screen readers say it's the selected one. */
  selected?: boolean;
  /** One of several that can be on (a checklist): read as a checkbox, ticked or not. */
  checked?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({ title, titleLines = 1, subtitle, detail, icon, iconColor = 'primary', iconBackground = 'primarySoft', tone, leading, trailing, onPress, showChevron = !!onPress, accessibilityLabel, selected, checked, style }: ListRowProps) {
  // Inside a swipeable row, a swipe mustn't also tap it (see SwipeableRow).
  const pressHandlers = useGuardedPress(onPress);
  const theme = useTheme();
  const tones = useTones();

  const content = (
    <>
      {leading ??
        (icon && (
          <View style={[styles.iconWrap, { backgroundColor: tone ? tones[tone].soft : theme[iconBackground] }]}>
            <Icon name={icon} size={IconSize.medium} color={iconColor} tint={tone && tones[tone].ink} />
          </View>
        ))}
      <View style={styles.text}>
        <ThemedText type="bodySemiBold" numberOfLines={titleLines}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="secondary" themeColor="textSecondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        )}
        {detail}
      </View>
      {trailing}
      {showChevron && <Icon name="chevron_right" size={IconSize.medium} color="textTertiary" />}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, style]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole={checked === undefined ? 'button' : 'checkbox'}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityState={checked !== undefined ? { checked } : selected === undefined ? undefined : { selected }}
      {...pressHandlers}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }, style]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinTouchSize + 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  iconWrap: {
    width: IconTileSize - 4,
    height: IconTileSize - 4,
    borderRadius: (IconTileSize - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
