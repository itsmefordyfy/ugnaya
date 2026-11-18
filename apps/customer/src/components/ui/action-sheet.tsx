import { Fragment, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Radius, Spacing } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

import type { ActionSheetProps } from './action-sheet.types';
import { Divider } from './divider';
import { Icon } from './icon';
import { ModalSafeArea, useModalPadding } from './modal-safe-area';
import { useModalGone } from './use-modal-gone';

export type { ActionSheetOption, ActionSheetProps } from './action-sheet.types';

const IN_MS = 220;
const OUT_MS = 160;
/** How far the sheet rises as it fades in. */
const RISE = 24;

/**
 * A short list of choices from the bottom of the screen, drawn by the app in the iPhone action
 * sheet's shape, on both platforms (owner's call, 2026-10-19: iOS used ActionSheetIOS before, with
 * no icons): the choices in one card with their icons, Cancel in its own below.
 * It stays mounted until it has faded out, like `PickerDialog`, so the card never empties mid-fade.
 * The chosen option runs only once the sheet has left the screen (see `useModalGone`), as
 * ActionSheetIOS did: on iPhone a photo picker opened from the fading sheet froze the app.
 */
export function ActionSheet({ visible, title, options, onClose }: ActionSheetProps) {
  const strings = useStrings();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const fade = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * RISE }] }));
  // The choice waiting for the sheet to be gone; one per opening, so a second tap while it fades does nothing.
  const chosen = useRef<(() => void) | null>(null);
  const runChosen = () => {
    const action = chosen.current;
    chosen.current = null;
    action?.();
  };
  const onDismiss = useModalGone(mounted, runChosen);
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible) progress.set(withTiming(1, { duration: reduceMotion ? 0 : IN_MS }));
    else
      progress.set(
        withTiming(0, { duration: reduceMotion ? 0 : OUT_MS }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
  }, [visible, reduceMotion, progress]);

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose} onDismiss={onDismiss}>
      <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable accessibilityRole="button" accessibilityLabel={strings.common.cancel} onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
        <ModalSafeArea>
          <SheetFrame style={rise}>
            <View style={[styles.group, styles.choices, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {title && (
                <>
                  <ThemedText type="secondary" themeColor="textSecondary" style={styles.title}>
                    {title}
                  </ThemedText>
                  <Divider />
                </>
              )}
              {/* A long list scrolls inside the card, so Cancel stays on screen (a short window, like the Duo's, can't fit them all). */}
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {options.map((option, index) => (
                  <Fragment key={option.label}>
                    {index > 0 && <Divider />}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      onPress={() => {
                        if (chosen.current) return;
                        tapFeedback();
                        chosen.current = option.onPress;
                        onClose();
                      }}
                      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
                      {option.icon && <Icon name={option.icon} size={22} color={option.destructive ? 'danger' : 'primaryText'} />}
                      <ThemedText themeColor={option.destructive ? 'danger' : 'text'}>{option.label}</ThemedText>
                    </Pressable>
                  </Fragment>
                ))}
              </ScrollView>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.common.cancel}
              onPress={onClose}
              style={({ pressed }) => [styles.group, styles.row, styles.cancel, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="bodySemiBold" themeColor="primaryText">
                {strings.common.cancel}
              </ThemedText>
            </Pressable>
          </SheetFrame>
        </ModalSafeArea>
      </Animated.View>
    </Modal>
  );
}

/** The sheet's place: centred at the bottom of the window's safe area, never wider than `maxWidth`, never taller than the window. */
function SheetFrame({ style, children }: { style: ComponentProps<typeof Animated.View>['style']; children: ReactNode }) {
  const padding = useModalPadding();
  return (
    <Animated.View pointerEvents="box-none" style={[styles.frame, padding, style]}>
      <View accessibilityViewIsModal style={styles.sheet}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    flexShrink: 1,
    gap: Spacing.two,
  },
  choices: {
    flexShrink: 1,
  },
  group: {
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.16)',
  },
  title: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
  },
  row: {
    minHeight: MinTouchSize + Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three + Spacing.one,
  },
  cancel: {
    justifyContent: 'center',
  },
});
