import { BlurTargetView, BlurView } from 'expo-blur';
import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View, type HostInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TABS, type Tab } from '@/components/tab-bar/tabs';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing, TabBarGap, TabBarHeight, TabBarInnerInset, TabBarSideInset, TabCapsuleInset, TabCapsuleOverhang } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';

/**
 * Whether this build has Android's blur views. A build made before expo-blur was added lacks
 * BlurTargetView; the bar is then a frosted fill instead of a live blur.
 */
const hasBlur = globalThis.expo?.getViewConfig?.('ExpoBlur', 'ExpoBlurTargetView') != null;

/** The icon in each tab, as on the iPhone's bar (icons only since 2026-11-04: no names under them). */
const ICON_SIZE = 28;

/**
 * Android's tab bar, drawn to match the iPhone's: a floating frosted capsule (iOS 26 Liquid
 * Glass), icons only (each tab keeps its name for screen readers), the active one in mint ink on a soft mint capsule. The
 * screens behind it are blurred through BlurTargetView, Android's way of giving a blur something to blur.
 */
export default function AppTabs() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const content = useRef<HostInstance>(null);

  return (
    <Tabs>
      {hasBlur ? (
        <BlurTargetView ref={content} style={styles.fill}>
          <TabSlot style={styles.fill} />
        </BlurTargetView>
      ) : (
        <TabSlot style={styles.fill} />
      )}
      <TabList asChild>
        {/* One flat style: TabList hands its child's style through a Slot, which rejects arrays. */}
        <View style={StyleSheet.flatten([styles.bar, { bottom: insets.bottom + TabBarGap, borderColor: theme.border, boxShadow: theme.shadowRaised }])}>
          {/* Clipped separately: Android's blur ignores borderRadius, so the corners come from the clip. */}
          <View style={styles.clip}>
            {hasBlur && <BlurView blurTarget={content} blurMethod="dimezisBlurViewSdk31Plus" intensity={80} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            {/* A wash of the page color over the blur, so icons read on any content behind; more
                opaque without a blur, so the bar still looks frosted. */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `${theme.background}${hasBlur ? 'B8' : 'EB'}` }]} />
          </View>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton tab={tab} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { tab: Tab };

/** One tab: its icon, in mint's ink on a soft mint capsule when it's the open one. Its name is for screen readers only. */
const TabButton = forwardRef<ComponentRef<typeof Pressable>, TabButtonProps>(function TabButton({ tab, isFocused, ...props }, ref) {
  const theme = useTheme();
  const strings = useStrings();
  const label = strings.tabs[tab.label];
  return (
    <Pressable ref={ref} {...props} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: !!isFocused }} style={styles.tab}>
      {({ pressed }) => (
        <>
          {/* The selected capsule, its own view mounted with its color: a background added to an
              existing view on Android kept square corners. */}
          {isFocused && <View style={[styles.capsule, { backgroundColor: theme.tabSelected }, pressed && styles.pressed]} />}
          <View style={[styles.tabContent, pressed && styles.pressed]}>
            <Icon name={tab.icon} size={ICON_SIZE} color={isFocused ? 'primaryText' : 'textSecondary'} filled={!!isFocused} />
          </View>
        </>
      )}
    </Pressable>
  );
});

/** The floating bar's own height: TabBarHeight less the gap under it (62, iOS 26's bar). */
const BAR_HEIGHT = TabBarHeight - TabBarGap;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  bar: {
    position: 'absolute',
    left: TabBarSideInset,
    right: TabBarSideInset,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    // Padding is measured inside the hairline border; the iPhone's numbers are from the outer edge.
    paddingHorizontal: TabBarInnerInset - StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    // The raised shadow comes from the theme (StyleSheet can't read it): see the bar's inline style.
  },
  clip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  // iOS 26's selected-tab capsule: 4 in from the bar's top and bottom (the tab sits inside the
  // border, so less the hairline), a little wider than its slot, fully rounded ends.
  capsule: {
    position: 'absolute',
    top: TabCapsuleInset - StyleSheet.hairlineWidth,
    bottom: TabCapsuleInset - StyleSheet.hairlineWidth,
    left: -TabCapsuleOverhang,
    right: -TabCapsuleOverhang,
    borderRadius: (BAR_HEIGHT - TabCapsuleInset * 2) / 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
