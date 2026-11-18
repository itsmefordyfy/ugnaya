import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

export type NoticeTone = 'success' | 'info' | 'warning' | 'danger';

export type NoticeProps = ViewProps & {
  tone: NoticeTone;
  /** Short message; pass `children` instead for rich text. */
  message?: string;
  children?: ReactNode;
};

const TONES: Record<NoticeTone, { icon: IconName; color: ThemeColor; background: ThemeColor }> = {
  success: { icon: 'check_circle', color: 'statusOk', background: 'statusOkSoft' },
  info: { icon: 'info', color: 'primary', background: 'primarySoft' },
  warning: { icon: 'warning', color: 'statusWarn', background: 'statusWarnSoft' },
  danger: { icon: 'error', color: 'danger', background: 'statusDangerSoft' },
};

/** An inline status message: icon + text + color, so meaning never rests on color alone. */
export function Notice({ tone, message, children, style, ...rest }: NoticeProps) {
  const theme = useTheme();
  const { icon, color, background } = TONES[tone];
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: theme[background] }, style]} {...rest}>
      <Icon name={icon} size={IconSize.medium} color={color} />
      <View style={styles.text}>
        {message ? (
          <ThemedText type="secondary" themeColor={tone === 'danger' ? 'danger' : 'text'}>
            {message}
          </ThemedText>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  text: {
    flex: 1,
    // Room for an action under the message, sized to its label rather than stretched.
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
});
