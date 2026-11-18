import { createContext, useContext, useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';

/** Lets a row inside `SwipeableRow` tell a real tap from the end of a swipe. */
export type SwipePressGuard = {
  /** True when a press should be dropped: it ended a swipe, or closed a row left open. */
  shouldIgnorePress: () => boolean;
};

export const SwipePressGuardContext = createContext<SwipePressGuard | null>(null);

/** A finger that moves further sideways than this between down and up was swiping, not tapping. */
const TAP_SLOP = 10;

/**
 * Press handlers for a row's `Pressable` that only fire on a real tap. On Android a `Pressable`
 * inside a swipeable row still reports a press when the finger lifts after a swipe, and tapping a
 * row that's swiped open should just close it, as in iOS Mail. The finger's own sideways travel
 * catches a quick swipe even before the row reports dragging. Outside a `SwipeableRow` the press
 * passes straight through. (As in CarMind and Ulamin.)
 */
export function useGuardedPress<E extends GestureResponderEvent>(onPress: ((event: E) => void) | undefined) {
  const guard = useContext(SwipePressGuardContext);
  const startX = useRef<number | null>(null);
  if (!onPress) return undefined;
  if (!guard) return { onPress };
  return {
    onPressIn: (event: E) => {
      startX.current = event.nativeEvent.pageX;
    },
    onPress: (event: E) => {
      const swiped = startX.current !== null && Math.abs(event.nativeEvent.pageX - startX.current) > TAP_SLOP;
      startX.current = null;
      if (swiped || guard.shouldIgnorePress()) return;
      onPress(event);
    },
  };
}
