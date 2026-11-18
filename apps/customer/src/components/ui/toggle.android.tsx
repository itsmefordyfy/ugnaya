import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

import type { ToggleProps } from './toggle.types';

export type { ToggleProps } from './toggle.types';

/** The iPhone's switch, in points: a 51 × 31 track with a 27 thumb, 2 in from the edge. */
const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB_SIZE = 27;
const THUMB_INSET = 2;
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2;
const DURATION_MS = 180;

/**
 * Android: the system Switch is Material, which would be the one Material control on an iPhone-
 * looking screen, so this draws the iPhone's switch instead: a wide track that fills with green and a white pill thumb that slides across.
 */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled, style }: ToggleProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.set(reduceMotion ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: DURATION_MS }));
  }, [value, reduceMotion, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [theme.toggleOff, theme.toggleOn]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        tapFeedback();
        onValueChange(!value);
      }}
      style={[disabled && styles.disabled, style]}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    paddingHorizontal: THUMB_INSET,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    // The thumb is white in both modes, like the iPhone's.
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  disabled: {
    opacity: 0.5,
  },
});
