import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Ugi, type UgiPose } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

type Slide = { key: string; pose: UgiPose; title: string; body: string };

const SLIDES: readonly Slide[] = [
  {
    key: 'wallet',
    pose: 'default',
    title: 'One wallet for the shops you love',
    body: 'Collect points at independent cafés, milk tea shops and restaurants, all in one app.',
  },
  {
    key: 'earn',
    pose: 'helpful',
    title: 'Show your code, earn points',
    body: 'At the counter, show your UGNAYA code. The cashier scans it and your points arrive in seconds.',
  },
  {
    key: 'redeem',
    pose: 'celebrating',
    title: 'Turn points into treats',
    body: 'Redeem free drinks, discounts and more. Each shop sets its own rewards.',
  },
];

/** The first screen a new person sees: Ugi explains UGNAYA in three slides, then Create account or Sign in. */
export function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const list = useRef<FlatList<Slide>>(null);
  const pageWidth = Math.min(width, MaxContentWidth);
  const last = page === SLIDES.length - 1;

  const goTo = (index: number) => {
    list.current?.scrollToOffset({ offset: index * pageWidth, animated: true });
    setPage(index);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.header}>
        <Logo height={28} />
      </View>
      <FlatList
        ref={list}
        data={SLIDES}
        keyExtractor={(slide) => slide.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={[styles.pager, { width: pageWidth }]}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / pageWidth))}
        getItemLayout={(_data, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: pageWidth }]}>
            <View style={styles.art}>
              <Ugi pose={item.pose} size={Math.min(260, width * 0.6)} />
            </View>
            <ThemedText type="hero" style={styles.center} accessibilityRole="header">
              {item.title}
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
              {item.body}
            </ThemedText>
          </View>
        )}
      />
      <View
        style={styles.dots}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Page ${page + 1} of ${SLIDES.length}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment' && page < SLIDES.length - 1) goTo(page + 1);
          if (event.nativeEvent.actionName === 'decrement' && page > 0) goTo(page - 1);
        }}>
        {SLIDES.map((slide, index) => (
          <View key={slide.key} style={[styles.dot, { backgroundColor: index === page ? theme.primary : theme.border }, index === page && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.actions}>
        {last ? (
          <Button
            title="Create account"
            onPress={() => {
              tapFeedback();
              router.push('/sign-up');
            }}
          />
        ) : (
          <Button
            title="Next"
            onPress={() => {
              tapFeedback();
              goTo(page + 1);
            }}
          />
        )}
        <Button title="I already have an account" variant="ghost" onPress={() => router.push('/sign-in')} style={styles.signIn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingBottom: Spacing.three,
  },
  pager: {
    flexGrow: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  art: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  dotActive: {
    width: 22,
  },
  actions: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  signIn: {
    alignSelf: 'center',
    minHeight: 44,
  },
});
