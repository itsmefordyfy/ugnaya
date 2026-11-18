import { router } from 'expo-router';

import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { HeaderControl } from '@/components/ui/header-control';
import { useStrings } from '@/hooks/use-strings';

/**
 * Centers the back arrow exactly in its circle (see GlassIconButton.iconOffsetX). Android draws the
 * glyph about half a point right of center; iOS draws it centered. Measured on both in pixels.
 */
export const BACK_NUDGE = process.env.EXPO_OS === 'android' ? -0.5 : 0;

/**
 * The back button in a stack header: the app's one round button (GlassIconButton), so it matches
 * the settings gear and every other circle. On iOS 26 it's placed with the system's shared glass
 * hidden (see useStackHeaderOptions), so there's one circle, not glass inside glass.
 */
export function HeaderBackButton() {
  const strings = useStrings();
  return (
    <HeaderControl>
      <GlassIconButton icon="arrow_back_ios_new" iconSize={20} iconOffsetX={BACK_NUDGE} accessibilityLabel={strings.common.back} onPress={() => router.back()} />
    </HeaderControl>
  );
}
