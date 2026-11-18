import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

/** The design is available (iOS 26+) and the API exists at runtime (some iOS 26 betas lacked it). */
export const hasLiquidGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export type GlassSurfaceProps = Omit<ViewProps, 'style'> & {
  children: ReactNode;
  /** Shape and layout. Corners come from `borderRadius`; never clip the glass with `overflow`. */
  style?: StyleProp<ViewStyle>;
  /** How it looks without Liquid Glass (older iOS, Android, web): usually a solid fill and border. */
  fallbackStyle?: StyleProp<ViewStyle>;
  /** `dark`: dark glass for white text over a photo. `theme` follows the app's light or dark mode. */
  appearance?: 'theme' | 'dark';
  /** Reacts to touch, for surfaces that are themselves buttons. */
  interactive?: boolean;
};

/**
 * A Liquid Glass surface for things that float over other content (a chip on a pet's photo), not
 * for content: cards, lists and filter chips stay solid.
 */
export function GlassSurface({ children, style, fallbackStyle, appearance = 'theme', interactive = false, ...rest }: GlassSurfaceProps) {
  if (hasLiquidGlass) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme={appearance === 'dark' ? 'dark' : 'auto'} isInteractive={interactive} style={style} {...rest}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[style, fallbackStyle]} {...rest}>
      {children}
    </View>
  );
}
