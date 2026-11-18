import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CelebrationProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

/** Ugi celebrating, for a moment worth marking (points earned at the counter, a reward handed over). */
export function Celebration({ visible, title, message, onClose }: CelebrationProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Card style={styles.card}>
          <Ugi pose="celebrating" size={150} />
          <ThemedText type="title" style={styles.center} accessibilityRole="header">
            {title}
          </ThemedText>
          <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
            {message}
          </ThemedText>
          <Button title="Nice!" material="solid" onPress={onClose} style={styles.button} />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.6,
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  center: {
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
  },
});
