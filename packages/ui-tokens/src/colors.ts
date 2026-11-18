/**
 * UGNAYA's colours (docs/BRAND_AND_DESIGN_SYSTEM.md, section 2).
 *
 * Brand: Deep Navy #1E2A78 (primary), Purple #7C3AED (accent, interaction), Orange #FF6B35 (reward),
 * Yellow #FFC247 (points), Teal #14B8A6 (success).
 *
 * Contrast rule, enforced by contrast.test.ts: navy and purple carry white text; orange, yellow and
 * teal carry dark ink. They are fills and shapes, never body text on a light page: use the `*Text`
 * shade for that.
 */
export type ColorSet = {
  // Surfaces and text
  surface: string;
  card: string;
  raised: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  inkDisabled: string;
  border: string;
  divider: string;
  /** Outlines of inputs and controls (needs 3:1). */
  borderStrong: string;
  /** The logo's wordmark: the board's deep navy on light, white on dark (matches @ugnaya/brand INK). */
  logoWordmark: string;
  // Brand
  primary: string;
  onPrimary: string;
  primarySoft: string;
  /** Text on the brand gradient. Fixed: the gradient is the same in both themes, unlike on-primary. */
  onGradient: string;
  accent: string;
  onAccent: string;
  accentText: string;
  accentSoft: string;
  reward: string;
  onReward: string;
  rewardText: string;
  rewardSoft: string;
  points: string;
  onPoints: string;
  pointsText: string;
  pointsSoft: string;
  // Status
  success: string;
  onSuccess: string;
  successText: string;
  successSoft: string;
  warning: string;
  warningText: string;
  warningSoft: string;
  danger: string;
  onDanger: string;
  dangerText: string;
  dangerSoft: string;
  info: string;
  infoText: string;
  infoSoft: string;
};

export const colors: { light: ColorSet; dark: ColorSet } = {
  light: {
    surface: '#F8FAFC',
    card: '#FFFFFF',
    raised: '#FFFFFF',
    ink: '#0F172A',
    inkMuted: '#475569',
    inkSubtle: '#64748B',
    inkDisabled: '#94A3B8',
    border: '#E2E8F0',
    divider: '#EEF2F6',
    borderStrong: '#7B8AA0',
    logoWordmark: '#0D1347',
    primary: '#1E2A78',
    onPrimary: '#FFFFFF',
    primarySoft: '#F2F2F7',
    onGradient: '#FFFFFF',
    accent: '#7C3AED',
    onAccent: '#FFFFFF',
    accentText: '#6D28D9',
    accentSoft: '#F5EFFE',
    reward: '#FF6B35',
    onReward: '#0F172A',
    rewardText: '#B93E12',
    rewardSoft: '#FFF0EB',
    points: '#FFC247',
    onPoints: '#0F172A',
    pointsText: '#7A4A00',
    pointsSoft: '#FFF2D7',
    success: '#14B8A6',
    onSuccess: '#0F172A',
    successText: '#0F766E',
    successSoft: '#E3F6F4',
    warning: '#B45309',
    warningText: '#92400E',
    warningSoft: '#FFF2D7',
    danger: '#DC2626',
    onDanger: '#FFFFFF',
    dangerText: '#B91C1C',
    dangerSoft: '#FCEEEE',
    info: '#0369A1',
    infoText: '#0369A1',
    infoSoft: '#EBF3F7',
  },
  // Navy-tinted near-black. Dark surfaces use borders rather than shadows.
  dark: {
    surface: '#0B1020',
    card: '#151B2E',
    raised: '#1C2440',
    ink: '#F1F5F9',
    inkMuted: '#A3AEC2',
    inkSubtle: '#8591A8',
    inkDisabled: '#5B6578',
    border: '#2C3243',
    divider: '#222A3F',
    borderStrong: '#6E727D',
    logoWordmark: '#FFFFFF',
    // Navy disappears on dark, so the primary lightens.
    primary: '#8B97F0',
    onPrimary: '#0B1020',
    primarySoft: '#282F4D',
    onGradient: '#FFFFFF',
    accent: '#A78BFA',
    onAccent: '#0B1020',
    accentText: '#A78BFA',
    accentSoft: '#2C2D4F',
    reward: '#FF6B35',
    onReward: '#0F172A',
    rewardText: '#FF8A5C',
    rewardSoft: '#3A2D35',
    points: '#FFC247',
    onPoints: '#0F172A',
    pointsText: '#FFC247',
    pointsSoft: '#363232',
    success: '#2DD4BF',
    onSuccess: '#0B1020',
    successText: '#2DD4BF',
    successSoft: '#183542',
    warning: '#FBBF24',
    warningText: '#FBBF24',
    warningSoft: '#35322D',
    danger: '#F87171',
    onDanger: '#0B1020',
    dangerText: '#F87171',
    dangerSoft: '#352737',
    info: '#38BDF8',
    infoText: '#38BDF8',
    infoSoft: '#1A324A',
  },
};

/** Restrained: at most one gradient surface per screen, never behind body text, never on controls. */
export const gradients = {
  /** The wallet card, the marketing hero band, onboarding. White text. */
  brand: { angle: 135, stops: ['#1E2A78', '#7C3AED'] },
  /** A "ready to redeem" ribbon, reward progress. Dark ink text. */
  reward: { angle: 135, stops: ['#FF6B35', '#FFC247'] },
} as const;
