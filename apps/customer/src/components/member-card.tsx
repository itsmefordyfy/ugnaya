import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { BrandSurface, Radius, Spacing } from '@/constants/theme';
import { formatPoints } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';

export type MemberCardProps = {
  name: string | null;
  memberId: string | null;
  merchantPoints: number;
  networkPoints: number;
  /** The network balance is shown only once it exists (the network is off until phase 3). */
  showNetwork: boolean;
  onPress?: () => void;
};

/** "AB2CD3EF" as "AB2C D3EF", easier to read aloud at a counter. */
export function spacedMemberId(id: string): string {
  return id.length === 8 ? `${id.slice(0, 4)} ${id.slice(4)}` : id;
}

/**
 * The member card: the customer's name, member id and point totals on the navy brand surface (the same in light and dark, like
 * a physical card). Tapping it opens the member code.
 */
export function MemberCard({ name, memberId, merchantPoints, networkPoints, showNetwork, onPress }: MemberCardProps) {
  const label = `UGNAYA member card. ${name ?? ''}. ${formatPoints(merchantPoints)} shop points${showNetwork ? `, ${formatPoints(networkPoints)} network points` : ''}. Shows your member code.`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={({ pressed }) => [styles.shadow, pressed && styles.pressed]}>
      <LinearGradient colors={BrandSurface.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.top}>
          <ThemedText type="overline" style={styles.brand}>
            UGNAYA MEMBER
          </ThemedText>
          <View style={styles.codeChip}>
            <Icon name="qr_code_2" size={16} tint={BrandSurface.ink} />
            <ThemedText type="caption" style={styles.ink}>
              Show code
            </ThemedText>
          </View>
        </View>
        <ThemedText type="heading" style={styles.ink} numberOfLines={1}>
          {name || 'Member'}
        </ThemedText>
        <View style={styles.figures}>
          <View style={styles.figure}>
            <ThemedText type="stat" tabular style={styles.ink} numberOfLines={1} adjustsFontSizeToFit>
              {formatPoints(merchantPoints)}
            </ThemedText>
            <ThemedText type="caption" style={styles.muted}>
              Shop points
            </ThemedText>
          </View>
          {showNetwork && (
            <View style={styles.figure}>
              <ThemedText type="statSmall" tabular style={styles.accent}>
                {formatPoints(networkPoints)}
              </ThemedText>
              <ThemedText type="caption" style={styles.muted}>
                Network points
              </ThemedText>
            </View>
          )}
        </View>
        {memberId && (
          <ThemedText type="secondary" tabular style={styles.muted} selectable>
            {`Member ID  ${spacedMemberId(memberId)}`}
          </ThemedText>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: Radius.card + 4,
    borderCurve: 'continuous',
    boxShadow: '0 12px 32px rgba(15, 26, 61, 0.28)',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  card: {
    borderRadius: Radius.card + 4,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BrandSurface.rim,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: BrandSurface.accent,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: BrandSurface.rim,
  },
  ink: {
    color: BrandSurface.ink,
  },
  muted: {
    color: BrandSurface.inkMuted,
  },
  accent: {
    color: BrandSurface.accent,
  },
  figures: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.five,
    marginTop: Spacing.two,
  },
  figure: {
    gap: Spacing.half,
    flexShrink: 1,
  },
});
