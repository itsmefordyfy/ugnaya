import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const LIGHT = require('@ugnaya/brand/assets/png/logo/logo-horizontal-2000.png');
const DARK = require('@ugnaya/brand/assets/png/logo/logo-horizontal-on-dark-2000.png');
const ASPECT = 2000 / 529;

export type LogoProps = { height: number; style?: StyleProp<ImageStyle> };

/** The UGNAYA logo from the brand package (the official artwork, never redrawn), in its light or dark version. */
export function Logo({ height, style }: LogoProps) {
  const dark = useColorScheme() === 'dark';
  return <Image source={dark ? DARK : LIGHT} style={[{ height, width: height * ASPECT }, style]} contentFit="contain" accessibilityRole="image" accessibilityLabel="UGNAYA" />;
}
