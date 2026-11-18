import type { NativeStackHeaderProps } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The header of a screen opened as a sheet on Android, drawn like the iPhone's page sheet: the
 * title centered between the screen's own header buttons (Cancel, Save). No grabber: the sheet
 * is closed by dragging it down or with Back.
 * Android form sheets have no native header, so the stack renders this one inside the sheet,
 * fed the same options (title, headerLeft, headerRight) the iPhone's native header gets.
 */
export function SheetHeader({ options, route }: NativeStackHeaderProps) {
  const theme = useTheme();
  const title = typeof options.headerTitle === 'string' ? options.headerTitle : (options.title ?? route.name);
  const left = options.headerLeft?.({ canGoBack: false, tintColor: theme.primaryText });
  const right = options.headerRight?.({ canGoBack: false, tintColor: theme.primaryText });
  return <SheetHeaderBar title={title} left={left} right={right} />;
}

export type SheetHeaderBarProps = { title: string; left?: ReactNode; right?: ReactNode };

/**
 * The one sheet header bar: Android's page sheets (through SheetHeader) and every content-sized
 * sheet on both platforms (SheetContent) draw this, so all the app's sheets have the same top.
 */
export function SheetHeaderBar({ title, left, right }: SheetHeaderBarProps) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <View style={styles.bar}>
        {/* Both sides share one width, so the title stays centered whatever the buttons are. */}
        <View style={[styles.side, styles.start]}>{left}</View>
        <ThemedText type="cardTitle" numberOfLines={1} accessibilityRole="header" style={styles.title}>
          {title}
        </ThemedText>
        <View style={[styles.side, styles.end]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  bar: {
    minHeight: MinTouchSize + Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
  },
  start: {
    justifyContent: 'flex-start',
  },
  end: {
    justifyContent: 'flex-end',
  },
  title: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
