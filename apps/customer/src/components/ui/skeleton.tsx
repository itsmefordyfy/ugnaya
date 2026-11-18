import { useEffect } from 'react';
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SkeletonBlockProps = {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

const PULSE_MS = 900;

/**
 * A placeholder shaped like the content that's loading, so the screen keeps its layout and
 * nothing jumps when the data arrives. It pulses gently on the UI thread, and holds still with
 * Reduce Motion. Hidden from screen readers; the screen announces loading itself.
 */
export function SkeletonBlock({ width = '100%', height, radius = Radius.medium, style }: SkeletonBlockProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(0.55, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        { width, height, borderRadius: radius, borderCurve: 'continuous', backgroundColor: theme.backgroundSelected },
        animated,
        style,
      ]}
    />
  );
}
