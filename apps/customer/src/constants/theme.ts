/**
 * UGNAYA's customer app design tokens (the owner's refined identity for the app, 2026-11-07): Midnight Navy, Warm Ivory, Muted
 * Teal, White, a cool border and Slate. Minimal and premium: ivory pages, white cards with a hairline, navy for text and the main
 * action, teal for points and good news. These are the app's own tokens (the web's live in packages/ui-tokens, a different brief).
 *
 * Contrast (WCAG 2.1, measured 2026-11-07; numbers are against ivory / white / the selected fill):
 * - Navy text #172554: 13.7 / 14.7 / 12.7. White on the navy button: 14.7.
 * - Slate #64748B is 4.43:1 on ivory (under 4.5), so it is the tertiary color (placeholders, hints, 3:1 is enough);
 *   secondary text is a darker step of it, #56657A (5.5 / 5.9).
 * - Muted Teal #5B8C85 is 3.5:1 on ivory: a fill and a large-figure color only. Teal text and icons use #3F6B65 (5.6 / 6.0).
 * Dark mode is its own set: a deep navy-black page, cards a step lighter with a border, ivory ink, and the primary button turns
 * ivory with navy ink (navy would vanish on the dark page).
 */

import { Platform } from 'react-native';

/** The brief's colors exactly; screens use the role tokens below. */
export const Palette = {
  navy: '#172554',
  ivory: '#F7F7F4',
  teal: '#5B8C85',
  white: '#FFFFFF',
  border: '#E8EAEF',
  slate: '#64748B',
} as const;

export const Colors = {
  light: {
    text: Palette.navy,
    textSecondary: '#56657A',
    textTertiary: Palette.slate,
    background: Palette.ivory,
    backgroundElement: Palette.white,
    /** A pressed or selected row, a secondary button, an input's fill. */
    backgroundSelected: '#EFEFEA',
    /** The selected tab's capsule (Android's drawn tab bar). */
    tabSelected: '#E9ECF5',
    border: Palette.border,
    /** The main action: Midnight Navy with white ink. */
    primary: Palette.navy,
    primaryText: Palette.navy,
    onPrimary: Palette.white,
    primarySoft: '#E9ECF5',
    /** Muted Teal: points, earning, success. A fill; its ink is `accentText`. */
    accent: Palette.teal,
    accentText: '#3F6B65',
    accentSoft: '#E7F0EE',
    toggleOn: '#3F6B65',
    toggleOff: '#D9DCE3',
    statusOk: '#3F6B65',
    statusOkSoft: '#E7F0EE',
    statusWarn: '#8A5A00',
    statusWarnSoft: '#FFF1D6',
    statusDanger: '#B3261E',
    statusDangerSoft: '#FDE6E3',
    danger: '#B3261E',
    overlay: 'rgba(23, 37, 84, 0.32)',
    shadowCard: '0 1px 2px rgba(23, 37, 84, 0.04), 0 4px 16px rgba(23, 37, 84, 0.05)',
    shadowRaised: '0 8px 28px rgba(23, 37, 84, 0.12)',
  },
  dark: {
    text: '#F3F4F1',
    textSecondary: '#A7B0C2',
    textTertiary: '#7D879B',
    background: '#0B1226',
    backgroundElement: '#141C33',
    backgroundSelected: '#1D2742',
    tabSelected: '#1D2742',
    border: '#26304A',
    primary: Palette.ivory,
    primaryText: '#B9C6EE',
    onPrimary: Palette.navy,
    primarySoft: '#1D2742',
    accent: Palette.teal,
    accentText: '#8CC2BA',
    accentSoft: '#16302D',
    toggleOn: '#5B8C85',
    toggleOff: '#39435C',
    statusOk: '#8CC2BA',
    statusOkSoft: '#16302D',
    statusWarn: '#F2C266',
    statusWarnSoft: '#3A2E14',
    statusDanger: '#FF8A80',
    statusDangerSoft: '#3D1D1B',
    danger: '#FF8A80',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadowCard: '0 1px 2px rgba(0, 0, 0, 0.3)',
    shadowRaised: '0 8px 28px rgba(0, 0, 0, 0.5)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemeColors = { [K in ThemeColor]: string };

/**
 * The member card and other navy brand surfaces: the same in both modes (a card is a physical-looking object), with fixed ink.
 */
export const BrandSurface = {
  gradient: ['#1E3170', '#172554', '#0F1A3D'] as const,
  ink: '#FFFFFF',
  inkMuted: 'rgba(255, 255, 255, 0.72)',
  accent: '#A7D4CD',
  rim: 'rgba(255, 255, 255, 0.12)',
  /** The QR's own background: always white, so any scanner reads it. */
  codeBackground: '#FFFFFF',
  codeInk: '#0F1A3D',
} as const;

/** Fixed ink on photos and the brand gradient (kept for the shared components). */
export const HeroInk = {
  text: '#FFFFFF',
  muted: 'rgba(255, 255, 255, 0.78)',
  /** A chip on the camera where glass is missing. */
  chip: 'rgba(15, 26, 61, 0.72)',
  /** The scan frame's outline. */
  glassBorder: 'rgba(255, 255, 255, 0.85)',
} as const;

/** Behind the camera. */
export const PhotoBackdrop = '#000000';

/**
 * Manrope for headings and the figures that matter (points), Inter for everything else (owner's brief, 2026-11-07). Both are
 * bundled by the expo-font plugin in app.json (assets/fonts, a file per weight: Inter 400–700, Manrope 600–800), never fetched.
 * iOS finds a family by its real name and picks the face from `fontWeight`; Android by the name the plugin gives it.
 * Both fonts have tabular digits (`tnum`).
 */
export const Fonts = Platform.select({
  ios: { sans: 'Inter', display: 'Manrope', mono: 'ui-monospace' },
  android: { sans: 'Inter', display: 'Manrope', mono: 'monospace' },
  default: { sans: 'Inter', display: 'Manrope', mono: 'monospace' },
});

/** The type scale: the only place sizes and weights live. */
export const Typography = {
  hero: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 38, fontWeight: 800, letterSpacing: -0.6 },
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34, fontWeight: 700, letterSpacing: -0.5 },
  section: { fontFamily: Fonts.display, fontSize: 19, lineHeight: 24, fontWeight: 700, letterSpacing: -0.2 },
  /** A card's or sheet's heading. */
  heading: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 22, fontWeight: 700, letterSpacing: -0.1 },
  /** A row's title. */
  cardTitle: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: 600 },
  body: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 23, fontWeight: 400 },
  bodySemiBold: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 23, fontWeight: 600 },
  secondary: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: 400 },
  secondarySemiBold: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: 600 },
  caption: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16, fontWeight: 500, letterSpacing: 0.1 },
  /** Small capitals over a figure ("MERCHANT POINTS"). */
  overline: { fontFamily: Fonts.sans, fontSize: 11, lineHeight: 14, fontWeight: 600, letterSpacing: 0.8 },
  button: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 20, fontWeight: 600 },
  link: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: 600 },
  /** The big points figure. */
  stat: { fontFamily: Fonts.display, fontSize: 36, lineHeight: 42, fontWeight: 800, letterSpacing: -0.8 },
  /** A points figure in a card or row. */
  statSmall: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 26, fontWeight: 700 },
  /** The 6-digit member code under the QR. */
  code: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 32, fontWeight: 700, letterSpacing: 4 },
  wordmark: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 30, fontWeight: 800, letterSpacing: 1 },
} as const;

export type TypographyRole = keyof typeof Typography;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  chip: 12,
  input: 14,
  medium: 14,
  button: 16,
  large: 20,
  card: 20,
  sheet: 28,
  pill: 999,
} as const;

/** Minimum touch target (Apple HIG) for every pressable. */
export const MinTouchSize = 44;
export const ButtonHeight = 52;
export const ButtonHeightSmall = 36;
export const InputHeight = 50;

export const IconSize = {
  small: 16,
  medium: 20,
  large: 24,
  tile: 24,
} as const;

/** The round soft tile an icon sits on (rows, shortcuts). */
export const IconTileSize = 44;
/** A merchant's logo in a row or card. */
export const LogoSize = { small: 40, medium: 52, large: 72 } as const;

/** Space above a sheet's title, so it clears the rounded top corners. */
export const SheetTopInset = Spacing.five;

/** Height of the tab bar above the home indicator: iOS's system bar, or Android's floating capsule plus the gap under it. */
export const TabBarHeight = Platform.select({ ios: 50, android: 72 }) ?? 0;
export const TabIconSize = 28;
export const TabBarGap = 10;
/** Android's tab bar, laid out like iOS 26's (Pawfetti's measurements). */
export const TabBarSideInset = 21;
export const TabCapsuleInset = 4;
export const TabCapsuleOverhang = 3.75;
export const TabBarInnerInset = TabCapsuleInset + TabCapsuleOverhang;
/** Space tab screens leave at the bottom, so their last content clears the tab bar. */
export const BottomTabInset = TabBarHeight + Spacing.three;
export const PageSheetDetent = 0.98;
export const SheetCornerRadius = Radius.sheet + 8;
export const SheetMaxWidth = 640;
export const MaxContentWidth = 720;

/** The member and voucher QR codes' size on screen (big enough for any counter scanner, with a quiet zone). */
export const QrSize = 232;

/** Tones for categories and icon tiles: an ink and a soft fill per mode (ink keeps 4.5:1 on its soft, cards and the page). */
export const Tones = {
  light: {
    navy: { ink: '#172554', soft: '#E9ECF5', solid: '#172554' },
    teal: { ink: '#3F6B65', soft: '#E7F0EE', solid: '#5B8C85' },
    amber: { ink: '#8A5A00', soft: '#FFF1D6', solid: '#F2C266' },
    rose: { ink: '#A3366A', soft: '#FDE8F1', solid: '#F5B3D0' },
    sky: { ink: '#2D5F94', soft: '#E1EFFC', solid: '#A5CDF2' },
    plum: { ink: '#7B3A8F', soft: '#F4E6F8', solid: '#D9AEE6' },
    neutral: { ink: '#56657A', soft: '#EFEFEA', solid: '#D9DCE3' },
    red: { ink: '#B3261E', soft: '#FDE6E3', solid: '#F4A9A2' },
  },
  dark: {
    navy: { ink: '#B9C6EE', soft: '#1D2742', solid: '#3A4E95' },
    teal: { ink: '#8CC2BA', soft: '#16302D', solid: '#5B8C85' },
    amber: { ink: '#F2C266', soft: '#3A2E14', solid: '#C9993B' },
    rose: { ink: '#F5A3C7', soft: '#40202F', solid: '#C4638F' },
    sky: { ink: '#9CC9F5', soft: '#1B2C40', solid: '#5C8FC4' },
    plum: { ink: '#DDA5EE', soft: '#35203D', solid: '#A468B8' },
    neutral: { ink: '#A7B0C2', soft: '#1D2742', solid: '#39435C' },
    red: { ink: '#FF8A80', soft: '#3D1D1B', solid: '#C4544B' },
  },
} as const;

export type Tone = keyof typeof Tones.light;

/** The side inset from which the system bars are taken to run along that edge (iPhone Duo). */
export const VerticalChromeMinInset = 56;
