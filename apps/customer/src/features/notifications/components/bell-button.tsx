import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useUnreadCount } from '@/api/customer';

/** The notifications bell with the unread count (capped at 99+). */
export function BellButton() {
  const theme = useTheme();
  const unread = useUnreadCount().data ?? 0;
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';
  return (
    <View>
      <GlassIconButton icon="notifications" accessibilityLabel={label} onPress={() => router.push('/notifications')} />
      {unread > 0 && (
        <View pointerEvents="none" style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.background }]}>
          <ThemedText type="caption" tabular style={[styles.count, { color: theme.background }]}>
            {unread > 99 ? '99+' : String(unread)}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: 700,
  },
});
