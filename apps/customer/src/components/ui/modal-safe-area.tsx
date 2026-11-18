import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/**
 * A `Modal` is its own native window: the safe-area values of the screen behind it can be wrong inside it
 * (a tab screen's bottom inset includes its tab bar; a screen's right inset belongs to the vertical bars of the
 * iPhone Duo, 2026-10-25). Wrapping what a Modal draws in its own provider makes it measure the Modal's window, in
 * any orientation, so nothing needs a launch-time value or a device name. It goes inside the fading layer, not
 * around it: on Android a provider above the animated layer left the whole sheet invisible.
 */
export function ModalSafeArea({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {children}
    </SafeAreaProvider>
  );
}

/**
 * Padding that keeps a sheet or dialog inside the window's safe area on every side, with `gap` of air from
 * the edges (more on a side where the system draws bars). Read inside `ModalSafeArea`.
 */
export function useModalPadding(gap: number = Spacing.two) {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + gap,
    paddingBottom: insets.bottom + gap,
    paddingLeft: Math.max(gap, insets.left),
    paddingRight: Math.max(gap, insets.right),
  };
}
