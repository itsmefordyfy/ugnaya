import QRCode from 'qrcode';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { BrandSurface, Radius } from '@/constants/theme';

/** Light squares around the code, as the QR standard asks, so scanners find its edges. */
const QUIET_ZONE = 4;

function qrPath(value: string): { path: string; units: number } {
  // Error correction M: a smudged or glare-hit screen still scans.
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const parts: string[] = [];
  for (let y = 0; y < modules.size; y += 1) {
    for (let x = 0; x < modules.size; x += 1) {
      if (modules.data[y * modules.size + x]) parts.push(`M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`);
    }
  }
  return { path: parts.join(''), units: modules.size + QUIET_ZONE * 2 };
}

export type QrCodeProps = {
  value: string;
  size: number;
  accessibilityLabel: string;
};

/** A QR code, always dark on white (also in dark mode), so every counter scanner reads it. */
export function QrCode({ value, size, accessibilityLabel }: QrCodeProps) {
  const { path, units } = qrPath(value);
  return (
    <View style={[styles.frame, { width: size, height: size }]} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size} viewBox={`0 0 ${units} ${units}`}>
        <Rect width={units} height={units} fill={BrandSurface.codeBackground} />
        <Path d={path} fill={BrandSurface.codeInk} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: BrandSurface.codeBackground,
  },
});
