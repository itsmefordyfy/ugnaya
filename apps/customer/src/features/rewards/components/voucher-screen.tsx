import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { refreshBalances } from '@/api/customer';
import type { Redemption } from '@/api/types';
import { QrCode } from '@/components/qr-code';
import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { NotFoundState } from '@/components/ui/state-view';
import { MaxContentWidth, QrSize, Spacing } from '@/constants/theme';
import { useMe } from '@/api/session';
import { useTheme } from '@/hooks/use-theme';
import { formatCountdown, pointsLabel } from '@/lib/format';
import { successFeedback } from '@/lib/haptics';
import { closeScreen } from '@/lib/navigation';
import { rpc } from '@/lib/supabase';

import { voucherByKey } from '../voucher-store';

const LIFETIME_S = 5 * 60;
const POLL_MS = 4000;

/**
 * The voucher: a one-time QR (`R:<token>`) for the cashier, with its 5-minute countdown. While it's open the app checks whether
 * the cashier has scanned it and then celebrates; an expired code says no points were taken and offers a new one.
 */
export function VoucherScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const me = useMe();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const voucher = voucherByKey(key);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = voucher ? Math.max(0, Math.round((Date.parse(voucher.expiresAt) - now) / 1000)) : 0;
  const expired = secondsLeft <= 0;

  // Has the cashier taken it? The newest few vouchers are enough: this one was made a moment ago.
  const status = useQuery({
    queryKey: ['voucher-status', me, key],
    queryFn: async () => {
      const list = await rpc<Redemption[]>('customer_redemptions', { p_limit: 10, p_offset: 0 });
      return list.find((r) => voucher && r.reward_id === voucher.rewardId && Math.abs(Date.parse(r.expires_at) - Date.parse(voucher.expiresAt)) < 1000) ?? null;
    },
    enabled: !!voucher,
    refetchInterval: (query) => (query.state.data?.status === 'used' || expired ? false : POLL_MS),
    gcTime: 0,
    retry: false,
  });
  const used = status.data?.status === 'used';

  useEffect(() => {
    if (!used) return;
    successFeedback();
    refreshBalances(queryClient, me);
  }, [used, queryClient, me]);

  const close = <GlassIconButton icon="close" accessibilityLabel="Close voucher" onPress={closeScreen} />;

  if (!voucher) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.top}>{close}</View>
        <NotFoundState icon="confirmation_number" title="This code is no longer here" message="Voucher codes stay on screen for 5 minutes. Get a new one from the reward." />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.top}>{close}</View>
      <View style={styles.body}>
        {used ? (
          <View style={styles.center}>
            <Ugi pose="celebrating" size={170} />
            <ThemedText type="title" style={styles.text} accessibilityRole="header">
              {`Enjoy your ${voucher.rewardName}!`}
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary" style={styles.text}>
              {`${voucher.merchant} redeemed it. ${pointsLabel(voucher.pointsCost)} were taken from your points there.`}
            </ThemedText>
          </View>
        ) : expired ? (
          <View style={styles.center}>
            <Ugi pose="thinking" size={150} />
            <ThemedText type="title" style={styles.text} accessibilityRole="header">
              This code expired
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary" style={styles.text}>
              No points were taken. Get a new code when you’re at the counter.
            </ThemedText>
          </View>
        ) : (
          <Card style={styles.card}>
            <ThemedText type="secondarySemiBold" themeColor="textSecondary" style={styles.text}>
              {`Show this to the cashier at ${voucher.merchant}`}
            </ThemedText>
            <ThemedText type="title" style={styles.text} accessibilityRole="header">
              {voucher.rewardName}
            </ThemedText>
            <QrCode value={voucher.code} size={QrSize} accessibilityLabel={`Voucher code for ${voucher.rewardName}`} />
            <View style={styles.timer}>
              <ProgressBar fraction={secondsLeft / LIFETIME_S} accessibilityLabel={`Expires in ${formatCountdown(secondsLeft)}`} />
              <ThemedText type="secondarySemiBold" tabular style={styles.text} accessibilityLiveRegion="polite">
                {`Expires in ${formatCountdown(secondsLeft)}`}
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.text}>
              {`${pointsLabel(voucher.pointsCost)} are taken only when the cashier scans this code. It works once.`}
            </ThemedText>
          </Card>
        )}
      </View>
      <View style={styles.actions}>
        {used ? (
          <Button title="Done" onPress={closeScreen} />
        ) : expired ? (
          <Button title="Get a new code" onPress={() => router.replace({ pathname: '/rewards/[id]', params: { id: voucher.rewardId } })} />
        ) : (
          <Button title="Close" variant="secondary" onPress={closeScreen} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  top: {
    flexDirection: 'row',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    textAlign: 'center',
  },
  timer: {
    width: QrSize,
    gap: Spacing.one,
  },
  actions: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
