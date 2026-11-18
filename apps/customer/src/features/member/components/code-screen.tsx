import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import { QrCode } from '@/components/qr-code';
import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { QrSize, Spacing } from '@/constants/theme';
import { spacedMemberId } from '@/components/member-card';
import { errorCode, errorMessage } from '@/lib/errors';
import { tapFeedback } from '@/lib/haptics';
import { TOTP_STEP_SECONDS } from '@/lib/totp';

import { useEarnWatch } from '../use-earn-watch';
import { useMemberCode } from '../use-member-code';
import { Celebration } from './celebration';

/** Whether the app is in front (codes stop ticking, and the watch stops polling, in the background). */
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return active;
}

/**
 * The member code: the QR the cashier scans (`U:<member id>:<6 digits>`, a new code every 30 seconds, made on this phone so it
 * works offline), the digits to read out if a scanner can't, and the scanner for a shop's own code. Points arrive when the
 * cashier scans this, not the other way round; the screen celebrates when they do.
 */
export function CodeScreen() {
  const focused = useIsFocused();
  const appActive = useAppActive();
  const active = focused && appActive;
  const code = useMemberCode(active);
  const watch = useEarnWatch(active);

  return (
    <Screen variant="tab">
      <TabHeader title="My code" />
      <Card style={styles.card}>
        <ThemedText type="secondarySemiBold" themeColor="textSecondary" style={styles.center}>
          Show this code at the counter
        </ThemedText>
        <View style={styles.qr}>
          {code.payload ? (
            <QrCode value={code.payload} size={QrSize} accessibilityLabel={`Your member code. Code ${code.digits?.split('').join(' ')}`} />
          ) : code.secret.isError ? (
            <View style={[styles.placeholder, styles.center]}>
              <Icon name="cloud_off" size={32} color="textSecondary" />
              <ThemedText type="secondary" themeColor="textSecondary" style={styles.center}>
                {errorCode(code.secret.error) === 'network' ? 'Your code needs a connection the first time on this phone. Check your connection and try again.' : errorMessage(code.secret.error)}
              </ThemedText>
              <Button title="Try again" size="small" variant="secondary" onPress={() => void code.secret.refetch()} />
            </View>
          ) : (
            <View style={[styles.placeholder, styles.center]}>
              <ActivityIndicator />
            </View>
          )}
        </View>
        {code.digits && (
          <View style={styles.digits}>
            <ThemedText type="code" tabular selectable accessibilityLabel={`Code ${code.digits.split('').join(' ')}`}>
              {`${code.digits.slice(0, 3)} ${code.digits.slice(3)}`}
            </ThemedText>
            <View style={styles.timer}>
              <ProgressBar fraction={code.secondsLeft / TOTP_STEP_SECONDS} accessibilityLabel={`New code in ${code.secondsLeft} seconds`} />
              <ThemedText type="caption" themeColor="textSecondary" tabular style={styles.center}>
                {`New code in ${code.secondsLeft} s`}
              </ThemedText>
            </View>
          </View>
        )}
        {code.memberId && (
          <ThemedText type="secondary" themeColor="textSecondary" tabular selectable style={styles.center}>
            {`Member ID  ${spacedMemberId(code.memberId)}`}
          </ThemedText>
        )}
      </Card>

      <View style={styles.how}>
        <Step icon="qr_code_2" text="The cashier scans your code (or types the 6 digits)." />
        <Step icon="add_circle" text="Your points arrive in a few seconds, at that shop and in your wallet." />
        <Step icon="lock" text="The code changes every 30 seconds, so a screenshot can’t be reused." />
      </View>

      <Button
        title="Scan a shop’s code"
        variant="secondary"
        icon="qr_code_scanner"
        onPress={() => {
          tapFeedback();
          router.push('/scanner');
        }}
      />
      <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
        Shops show their own UGNAYA code at the counter. Scan it to see their rewards and save them as a favorite.
      </ThemedText>

      <Celebration
        visible={!!watch.celebrate}
        title={watch.celebrate?.title ?? ''}
        message={watch.celebrate?.body ?? ''}
        onClose={watch.dismiss}
      />
    </Screen>
  );
}

function Step({ icon, text }: { icon: 'qr_code_2' | 'add_circle' | 'lock'; text: string }) {
  return (
    <View style={styles.step}>
      <Icon name={icon} size={20} color="accentText" />
      <ThemedText type="secondary" themeColor="textSecondary" style={styles.flex}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  qr: {
    width: QrSize,
    height: QrSize,
  },
  placeholder: {
    width: QrSize,
    height: QrSize,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
    alignItems: 'center',
  },
  digits: {
    alignItems: 'center',
    gap: Spacing.two,
    width: QrSize,
  },
  timer: {
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  how: {
    gap: Spacing.two,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
});
