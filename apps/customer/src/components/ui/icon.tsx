import { StyleSheet, View, type ViewProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { MaterialSymbols, MaterialSymbolsFilled, type MaterialSymbolName } from './material-symbols';

/** A Material Symbol by its name (https://fonts.google.com/icons). */
export type IconName = MaterialSymbolName;

/**
 * The font's line box, as a share of the font size, and the room above its em square: Material
 * Symbols has ascent 1056 plus descent 96 on a 960 em (the glyph sits in the middle).
 */
const LINE = { height: (1056 + 96) / 960, margin: (1056 + 96 - 960) / 2 / 960 };

export type IconProps = Omit<ViewProps, 'children'> & {
  name: IconName;
  size?: number;
  color?: ThemeColor;
  /** Fixed color for icons on photos or fixed-color surfaces, where theme colors don't apply. */
  tint?: string;
  /** The filled-in glyph, for an "on" state. */
  filled?: boolean;
};

/** A Material Symbol, the same on iOS and Android, so the app has one look on both. */
export function Icon({ color = 'text', tint, size = 20, name, filled = false, style, ...rest }: IconProps) {
  const theme = useTheme();
  const themed = color === 'primary' ? 'primaryText' : color;
  const ink = tint ?? theme[themed];
  // The glyph is a font character, so its text box gets the font's whole line, set explicitly and
  // shifted up by the margin above the glyph: that lands the glyph exactly on the icon's square on
  // both platforms. Left to size itself, iOS squeezes the text to the square's height but still
  // draws the glyph on the full line, so it sat low and lost its bottom edge.
  const glyphStyle = [styles.glyph, { top: -size * LINE.margin, width: size, height: size * LINE.height, lineHeight: size * LINE.height }];
  return (
    <View style={[{ width: size, height: size }, style]} accessible={false} {...rest}>
      {filled ? (
        <MaterialSymbolsFilled name={name} size={size} color={ink} allowFontScaling={false} style={glyphStyle} />
      ) : (
        <MaterialSymbols name={name} size={size} color={ink} allowFontScaling={false} style={glyphStyle} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: {
    position: 'absolute',
    left: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
