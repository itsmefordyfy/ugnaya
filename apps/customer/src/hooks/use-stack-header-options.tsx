import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import { HeaderBackButton } from '@/components/header-back-button';
import { Typography } from '@/constants/theme';
import { useChromeLayout } from '@/hooks/use-chrome-layout';
import { useTheme } from '@/hooks/use-theme';

/** A stack's screen options as an object (Stack also accepts a function). */
type StackScreenOptions = Exclude<NonNullable<ComponentProps<typeof Stack>['screenOptions']>, (...args: never[]) => unknown>;

/**
 * Header settings shared by every stack screen, so they all look the same: centered titles and the
 * round back button (HeaderBackButton). iOS 26 wraps header buttons in its own glass; the back
 * button brings its own circle, so it goes in as a custom item with that shared background hidden.
 * Page sheets clear it (see pageSheet in the root layout), so their own Cancel button shows instead.
 */
export function useStackHeaderOptions(): StackScreenOptions {
  const colors = useTheme();
  // The iPhone Duo closed (a system bar down one side): UIKit puts the title next to the back button instead of in the middle, so there
  // the title is drawn as the header's center view (2026-10-25, owner's request: every screen's title centered).
  const chrome = useChromeLayout();
  return {
    ...(process.env.EXPO_OS === 'ios' && chrome.vertical
      ? {
          headerTitle: ({ children }: { children: string }) => (
            <Text numberOfLines={1} style={{ color: colors.text, fontFamily: Typography.cardTitle.fontFamily, fontWeight: '600', fontSize: Typography.cardTitle.fontSize + 1, textAlign: 'center', maxWidth: 220 }}>
              {children}
            </Text>
          ),
        }
      : {}),
    headerShadowVisible: false,
    // Header links are text: mint's readable ink step.
    headerTintColor: colors.primaryText,
    headerTitleStyle: { color: colors.text, fontFamily: Typography.cardTitle.fontFamily, fontWeight: '600' },
    headerLargeTitleStyle: { color: colors.text, fontFamily: Typography.title.fontFamily, fontWeight: '700' },
    headerStyle: { backgroundColor: colors.background },
    // Titles centered on Android too, as on the iPhone.
    headerTitleAlign: 'center',
    headerBackVisible: false,
    ...(process.env.EXPO_OS === 'ios'
      ? {
          unstable_headerLeftItems: ({ canGoBack }: { canGoBack?: boolean }) =>
            canGoBack ? [{ type: 'custom' as const, element: <HeaderBackButton />, hidesSharedBackground: true }] : [],
        }
      : { headerLeft: ({ canGoBack }: { canGoBack?: boolean }) => (canGoBack ? <HeaderBackButton /> : null) }),
  };
}
