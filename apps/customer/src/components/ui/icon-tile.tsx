import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IconSize, IconTileSize, type Tone } from '@/constants/theme';
import { useTones } from '@/hooks/use-tones';

import { Icon, type IconName } from './icon';

export type IconTileProps = {
  icon: IconName;
  /** The tone (ink on its soft fill); navy by default. */
  tone?: Tone;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** An icon on its soft circle, in its tone's ink. */
export function IconTile({ icon, tone = 'navy', size = IconTileSize, style }: IconTileProps) {
  const tones = useTones();
  const colors = tones[tone];
  const glyph = size >= IconTileSize + 8 ? IconSize.large : size >= IconTileSize ? IconSize.medium : IconSize.small;
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft }, style]}>
      <Icon name={icon} size={glyph} tint={colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
