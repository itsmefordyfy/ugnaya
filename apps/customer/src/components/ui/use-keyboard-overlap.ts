import { useEffect, useState, type RefObject } from 'react';
import { Keyboard, LayoutAnimation, type HostInstance } from 'react-native';

export type KeyboardOverlapOptions = {
  /**
   * Measure on iOS too. Off for scrolling screens, whose scroll views move their content clear of
   * the keyboard on iOS natively. On for a view pinned under the content (a chat's composer, a
   * form's Save): nothing moves it, so the keyboard would cover it.
   */
  ios?: boolean;
  /**
   * The view ends at the bottom of the screen (every `Screen` does, sheet or page): on iOS its
   * overlap is then the keyboard's height, not measured. In an iOS page sheet the measurement comes
   * out short by the sheet's distance from the top of the screen (42 pt on an iPhone 17 Pro Max),
   * since iOS reports the sheet's views from the sheet's own top: Save stayed under the keyboard.
   */
  reachesBottom?: boolean;
};

/**
 * How far the on-screen keyboard reaches over a view. On Android a full-screen page shrinks for
 * the keyboard on its own (so this stays 0), but a page sheet can't: it's nearly full height, so
 * the system only slides it up as far as the top of the screen and the keyboard still covers its
 * bottom. Measured rather than assumed, so it's right in both. On iOS only when `ios` is set.
 */
/** Longer than a sheet's slide-in, so its resting place is what's measured; the second catches a slow device, or a sheet busy rendering a list under its form (Log a meal, Update weight). */
const SHEET_SETTLE_MS = [450, 1000];

export function useKeyboardOverlap(ref: RefObject<HostInstance | null>, { ios = false, reachesBottom = false }: KeyboardOverlapOptions = {}): number {
  const [overlap, setOverlap] = useState(0);
  const active = process.env.EXPO_OS === 'android' || (ios && process.env.EXPO_OS === 'ios');

  useEffect(() => {
    if (!active) return;
    // iOS announces the keyboard before it slides in, so the view moves with it rather than after.
    const showEvent = process.env.EXPO_OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = process.env.EXPO_OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    let settle: ReturnType<typeof setTimeout>[] = [];
    let current = 0;
    // iOS: the change rides the keyboard's own animation, as KeyboardAvoidingView does, instead of jumping ahead of it.
    const apply = (next: number, duration: number) => {
      if (next === current) return;
      current = next;
      if (process.env.EXPO_OS === 'ios' && duration > 0) LayoutAnimation.configureNext({ duration, update: { type: LayoutAnimation.Types.keyboard, duration } });
      setOverlap(next);
    };
    const clearSettle = () => {
      settle.forEach(clearTimeout);
      settle = [];
    };
    const shown = Keyboard.addListener(showEvent, (event) => {
      if (reachesBottom && process.env.EXPO_OS === 'ios') {
        apply(Math.round(event.endCoordinates.height), event.duration);
        return;
      }
      const keyboardTop = event.endCoordinates.screenY;
      const measure = (duration: number) =>
        ref.current?.measureInWindow((_x, y, _width, height) => {
          apply(Math.max(0, Math.round(y + height - keyboardTop)), duration);
        });
      measure(event.duration);
      // A sheet opened with a field already focused (New expense) is still sliding up when the
      // keyboard arrives, and measured then it's lower than it rests: the overlap came out far too
      // large and squeezed the form to nothing. Measured again once the sheet has settled.
      clearSettle();
      settle = SHEET_SETTLE_MS.map((ms) => setTimeout(() => measure(0), ms));
    });
    const hidden = Keyboard.addListener(hideEvent, (event) => {
      clearSettle();
      apply(0, event.duration);
    });
    return () => {
      clearSettle();
      shown.remove();
      hidden.remove();
    };
  }, [ref, active, reachesBottom]);

  return active ? overlap : 0;
}
