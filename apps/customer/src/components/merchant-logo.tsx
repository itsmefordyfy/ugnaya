import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { LogoSize, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTones } from '@/hooks/use-tones';
import { categoryOf } from '@/lib/categories';
import { logoUrl } from '@/lib/logo';

export type MerchantLogoProps = {
  path: string | null | undefined;
  category: string | null | undefined;
  size?: keyof typeof LogoSize;
};

/** A shop's logo on a rounded square; without one (or if it fails to load), its category's icon on the category tone. */
export function MerchantLogo({ path, category, size = 'small' }: MerchantLogoProps) {
  const theme = useTheme();
  const tones = useTones();
  const [failed, setFailed] = useState(false);
  const url = failed ? null : logoUrl(path);
  const side = LogoSize[size];
  const look = categoryOf(category);
  const frame = { width: side, height: side, borderRadius: side * 0.28 };
  if (url) {
    return (
      <View style={[styles.frame, frame, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <Image source={url} style={styles.image} contentFit="cover" transition={150} onError={() => setFailed(true)} accessible={false} />
      </View>
    );
  }
  return (
    <View style={[styles.frame, styles.center, frame, { backgroundColor: tones[look.tone].soft, borderColor: 'transparent' }]}>
      <Icon name={look.icon} size={Math.round(side * 0.46)} tint={tones[look.tone].ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
