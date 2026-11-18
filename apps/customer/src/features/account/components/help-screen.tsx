import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { SUPPORT_EMAIL } from '@/constants/config';
import { emailSupport } from '@/lib/links';

const FAQ: { q: string; a: string }[] = [
  { q: 'How do I earn points?', a: 'Open My code and show it at the counter. The cashier scans it (or types the 6 digits) and enters what you spent. Points arrive in seconds.' },
  { q: 'Why didn’t my points arrive?', a: 'Ask the cashier to check the scan went through; it shows on their screen. If it still doesn’t appear, email us with the shop, the time and your member ID.' },
  { q: 'Can I use a screenshot of my code?', a: 'No. The code changes every 30 seconds so nobody else can use it. It works without internet once it has loaded on this phone.' },
  { q: 'How do I redeem a reward?', a: 'Open the reward and tap Redeem at the counter. Show the voucher code to the cashier within 5 minutes. Points are taken only when they scan it.' },
  { q: 'Do points expire?', a: 'Each shop sets its own rule. Your wallet shows the expiry date; every visit moves it forward.' },
  { q: 'Can I spend one shop’s points at another?', a: 'Shop points are spent at that shop. Network points, once UGNAYA turns them on, work at every participating shop.' },
];

/** Answers to the common questions, and a way to reach a person. */
export function HelpScreen() {
  return (
    <Screen>
      {FAQ.map((item) => (
        <Card key={item.q} style={styles.card}>
          <ThemedText type="heading">{item.q}</ThemedText>
          <ThemedText type="secondary" themeColor="textSecondary">
            {item.a}
          </ThemedText>
        </Card>
      ))}
      <View style={styles.contact}>
        <ThemedText type="section">Still need help?</ThemedText>
        <ThemedText type="secondary" themeColor="textSecondary" selectable>
          {`Email ${SUPPORT_EMAIL}. Include your member ID (Account) so we can find your visits.`}
        </ThemedText>
        <Button title="Email support" icon="mail" onPress={() => emailSupport('Help with the UGNAYA app')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
  },
  contact: {
    gap: Spacing.two,
  },
});
