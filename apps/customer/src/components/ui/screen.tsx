import { createContext, use, useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import { ScrollView, StyleSheet, TextInput, View, type ScrollViewProps, type StyleProp, type ViewStyle, type HostInstance, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useChromeLayout } from '@/hooks/use-chrome-layout';
import { useTheme } from '@/hooks/use-theme';

import { useKeyboardOverlap } from './use-keyboard-overlap';

export type ScreenVariant = 'stack' | 'tab';

export type ScreenProps = Omit<ScrollViewProps, 'contentContainerStyle'> & {
  children: ReactNode;
  /**
   * `stack`: below a native header, which supplies the top inset.
   * `tab`: a tab root with no header, so pad for the status bar and tab bar.
   */
  variant?: ScreenVariant;
  /** Content pinned below the scroll area, e.g. a form's Save button. */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** What a form can ask of its screen: bring a field into view (the first invalid one, on Save). */
  ref?: Ref<ScreenHandle>;
};

export type ScreenHandle = {
  /** Scrolls so `view` sits in the upper part of what's visible. */
  reveal: (view: HostInstance | null) => void;
};

const RevealContext = createContext<ScreenHandle['reveal'] | null>(null);

/** The enclosing Screen's `reveal`, for a field whose content grows under it (suggestions) and must be scrolled into view; null outside a Screen. */
export function useScreenReveal(): ScreenHandle['reveal'] | null {
  return use(RevealContext);
}

/**
 * Lets the scroll area finish shrinking above the keyboard before the focused field is measured;
 * then once more, after Android's own scroll to the focused field, which measured mid-way left the
 * field under Save (New record's Name or product).
 */
const KEYBOARD_SCROLL_DELAYS_MS = [80, 450];

/**
 * Standard scrolling screen. Uses the native header's automatic content insets on iOS and keeps
 * content readable on tablets via a max width.
 */
export function Screen({ children, footer, variant = 'stack', contentStyle, ref, ...rest }: ScreenProps) {
  const theme = useTheme();
  const padding = useScreenPadding(variant, !!footer);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const rootRef = useRef<HostInstance>(null);
  const offset = useRef(0);
  const viewportHeight = useRef(0);
  // Room for the keyboard: it lifts the footer (Save) above the keyboard and shrinks the scroll
  // area to what's still visible. Android page sheets need it whatever the screen (the system
  // can't move them out of the way); on iOS only a screen with a footer, which nothing else moves:
  // the scroll view's own keyboard inset left Save under the keyboard on every iPhone form.
  const keyboardOverlap = useKeyboardOverlap(rootRef, { ios: !!footer, reachesBottom: true });

  const reveal = (view: HostInstance | null) => {
    if (!view) return;
    rootRef.current?.measureInWindow((_x, rootY) => {
      view.measureInWindow((_viewX, viewY) => {
        // A quarter down the visible area: clear of a header drawn over the content (iOS).
        const target = offset.current + viewY - rootY - viewportHeight.current / 4;
        scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: true });
      });
    });
  };
  useImperativeHandle(ref, () => ({ reveal }));

  // Once the scroll area has shrunk above the keyboard, bring the field being typed in into view
  // (a full-screen page gets this from the system; a sheet doesn't).
  useEffect(() => {
    if (keyboardOverlap === 0) return;
    const reveal = () => {
      const input = TextInput.State.currentlyFocusedInput();
      rootRef.current?.measureInWindow((_x, rootY) => {
        const visibleBottom = rootY + viewportHeight.current;
        input?.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
          const hidden = inputY + inputHeight + Spacing.three - visibleBottom;
          // Above the top: an earlier measurement, taken while the sheet was still sliding in, scrolled too far.
          const above = rootY + Spacing.three - inputY;
          if (hidden > 0) scrollRef.current?.scrollTo({ y: offset.current + hidden, animated: true });
          else if (above > 0) scrollRef.current?.scrollTo({ y: Math.max(0, offset.current - above), animated: true });
        });
      });
    };
    const timers = KEYBOARD_SCROLL_DELAYS_MS.map((ms) => setTimeout(reveal, ms));
    return () => timers.forEach(clearTimeout);
  }, [keyboardOverlap]);

  return (
    <View ref={rootRef} style={[styles.root, { backgroundColor: theme.background, paddingBottom: keyboardOverlap }]}>
      <ScrollView
        ref={scrollRef}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
        }}
        onLayout={(event) => {
          viewportHeight.current = event.nativeEvent.layout.height;
        }}
        scrollEventThrottle={32}
        contentInsetAdjustmentBehavior={variant === 'stack' ? 'automatic' : 'never'}
        keyboardShouldPersistTaps="handled"
        // Android page sheets: lets the sheet see this scroll, so dragging down scrolls back up
        // through the form and only closes the sheet once it's at the top (as on iOS). Without
        // it the sheet takes every downward drag and closes mid-form.
        nestedScrollEnabled
        // iOS: scroll the focused field above the keyboard instead of typing behind it. A screen
        // with a footer is shrunk above the keyboard instead (above), and an inset as well would
        // leave a keyboard's height of blank space under the form.
        automaticallyAdjustKeyboardInsets={!footer}
        keyboardDismissMode="interactive"
        contentContainerStyle={[styles.content, { paddingTop: padding.paddingTop, paddingBottom: padding.paddingBottom, paddingLeft: padding.paddingLeft, paddingRight: padding.paddingRight }, contentStyle]}
        {...rest}>
        <RevealContext value={reveal}>{children}</RevealContext>
      </ScrollView>
      {footer && (
        <View
          style={[
            styles.footer,
            {
              // Over the keyboard, the home-indicator room below the button isn't needed.
              paddingBottom: keyboardOverlap > 0 ? Spacing.two : padding.footerBottom,
              paddingLeft: padding.paddingLeft,
              paddingRight: padding.paddingRight,
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}>
          {footer}
        </View>
      )}
    </View>
  );
}

/** Content padding for scrollable screens and lists, shared so FlatList screens match `Screen`. */
export function useScreenPadding(variant: ScreenVariant, hasFooter = false) {
  const insets = useSafeAreaInsets();
  const chrome = useChromeLayout();
  // A tab bar along the side takes no room at the bottom, and the Scan button sits in it.
  const bottomChrome = variant === 'tab' && !chrome.vertical ? BottomTabInset : 0;
  return {
    paddingTop: variant === 'tab' ? insets.top + Spacing.three : Spacing.three,
    paddingBottom: hasFooter ? Spacing.four : insets.bottom + bottomChrome + Spacing.five,
    footerBottom: insets.bottom + Spacing.two,
    // The sides' own insets (iPhone Duo, 2026-10-25: its vertical status bar takes 84 pt of the
    // right edge, and the two sides are never assumed equal). Zero on a phone held upright.
    paddingLeft: insets.left + Spacing.three,
    paddingRight: insets.right + Spacing.three,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
