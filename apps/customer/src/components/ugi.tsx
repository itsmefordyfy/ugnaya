import { Image } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

/**
 * Ugi, UGNAYA's mascot, from the brand package (packages/brand/assets/mascot, cut from the owner's board). Used only for
 * onboarding, empty states and celebrations (owner's brief), never as decoration on working screens. No animation (owner's call).
 */
const POSES = {
  default: require('@ugnaya/brand/assets/mascot/default.webp'),
  happy: require('@ugnaya/brand/assets/mascot/happy.webp'),
  helpful: require('@ugnaya/brand/assets/mascot/helpful.webp'),
  celebrating: require('@ugnaya/brand/assets/mascot/celebrating.webp'),
  excited: require('@ugnaya/brand/assets/mascot/excited.webp'),
  thinking: require('@ugnaya/brand/assets/mascot/thinking.webp'),
  wink: require('@ugnaya/brand/assets/mascot/wink.webp'),
  front: require('@ugnaya/brand/assets/mascot/front.webp'),
} as const;

/** Each pose's width over its height, so a given height never stretches it. */
const ASPECT: Record<UgiPose, number> = {
  default: 1053 / 1309,
  happy: 444 / 419,
  helpful: 446 / 436,
  celebrating: 419 / 433,
  excited: 494 / 465,
  thinking: 388 / 465,
  wink: 402 / 412,
  front: 368 / 597,
};

export type UgiPose = keyof typeof POSES;

export type UgiProps = {
  pose: UgiPose;
  /** Height in points; the width follows the pose. */
  size: number;
  style?: StyleProp<ImageStyle>;
};

/** Decorative: the words next to Ugi carry the meaning, so screen readers skip him. */
export function Ugi({ pose, size, style }: UgiProps) {
  return <Image source={POSES[pose]} style={[{ height: size, width: size * ASPECT[pose] }, style]} contentFit="contain" accessible={false} />;
}
