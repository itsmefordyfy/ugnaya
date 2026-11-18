import { MaterialSymbolsRounded_400Regular } from '@expo-google-fonts/material-symbols-rounded/400Regular';
import { MaterialSymbolsRounded_400Regular_Filled } from '@expo-google-fonts/material-symbols-rounded/400Regular_Filled';
import createIconSet from '@expo/vector-icons/createIconSet';
import type { AndroidSymbol } from 'expo-symbols';

import glyphMap from './material-symbols.json';

/** A Material Symbols name, e.g. `pets`: https://fonts.google.com/icons */
export type MaterialSymbolName = AndroidSymbol;

/**
 * Google's Material Symbols (open source), drawn from the same font on iOS and Android so the app
 * has one set of icons. The glyph map is expo-symbols' own (`build/android/symbols.json`), copied
 * because the package doesn't export it; recopy it if expo-symbols updates. Rounded (owner's brief, 2026-11-02: a consistent rounded icon style) shares the codepoints of the outlined set.
 * As an icon family it can also render to an image (`getImageSource`), which the native iOS tab
 * bar needs.
 */
export const MaterialSymbols = createIconSet(glyphMap as Record<MaterialSymbolName, number>, 'MaterialSymbolsRounded_400Regular', MaterialSymbolsRounded_400Regular);

/** The same symbols filled in (Material's FILL 1), for an "on" state. Same glyph map. */
export const MaterialSymbolsFilled = createIconSet(
  glyphMap as Record<MaterialSymbolName, number>,
  'MaterialSymbolsRounded_400Regular_Filled',
  MaterialSymbolsRounded_400Regular_Filled,
);
