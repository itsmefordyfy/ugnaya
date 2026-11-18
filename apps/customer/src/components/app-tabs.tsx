import { NativeTabs } from 'expo-router/native-tabs';
import type { ColorValue } from 'react-native';

import { TABS, type Tab } from '@/components/tab-bar/tabs';
import { MaterialSymbols, type MaterialSymbolName } from '@/components/ui/material-symbols';
import { TabIconSize } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';

/**
 * Material Symbols as a tab icon family. The tab bar asks for 24pt images; this draws them at
 * TabIconSize instead, so the icons read as large as the system's own.
 */
const TabSymbols = {
  getImageSource: (name: MaterialSymbolName, _size: number, color: ColorValue) => MaterialSymbols.getImageSource(name, TabIconSize, color),
};

/**
 * The system tab bar (Liquid Glass on iOS 26), with each tab's name under its icon (Apple's HIG; UGNAYA's call, 2026-11-07). The
 * active tab takes the navy ink. disableAutomaticContentInsets: every tab screen pads for the status bar and tab bar itself
 * (useScreenPadding). No custom labelStyle font: on iOS it replaces the tab bar's own title font.
 */
export default function AppTabs() {
  const colors = useTheme();
  const strings = useStrings();
  const trigger = (tab: Tab) => (
    <NativeTabs.Trigger key={tab.name} name={tab.name} disableAutomaticContentInsets accessibilityLabel={strings.tabs[tab.label]}>
      <NativeTabs.Trigger.Label>{strings.tabs[tab.label]}</NativeTabs.Trigger.Label>
      {/* A function's output, not a component: a trigger only reads an Icon that is its direct child. */}
      <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={TabSymbols} name={tab.icon} />} renderingMode="template" md={tab.icon} />
    </NativeTabs.Trigger>
  );
  return (
    <NativeTabs backgroundColor={colors.background} indicatorColor={colors.primarySoft} tintColor={colors.primaryText}>
      {TABS.map(trigger)}
    </NativeTabs>
  );
}
