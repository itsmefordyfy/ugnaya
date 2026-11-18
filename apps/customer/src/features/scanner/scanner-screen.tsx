import { CameraView, PermissionStatus, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { GlassSurface } from '@/components/ui/glass-surface';
import { HeroInk, PhotoBackdrop, Radius, Spacing } from '@/constants/theme';
import { successFeedback } from '@/lib/haptics';
import { closeScreen } from '@/lib/navigation';
import { readScan } from '@/lib/scan-code';

/** A message about the last code stays this long, then the hint comes back. */
const MESSAGE_MS = 3000;
const FRAME_SHARE = 0.7;

const HINT = 'Point at the shop’s UGNAYA code';

/** What to say about a code that doesn't open a shop. */
const NOT_A_SHOP = {
  member: 'That’s a member code: it’s for the cashier to scan. Point at the shop’s own code.',
  voucher: 'That’s a voucher: show it to the cashier to redeem it.',
  unknown: 'That isn’t a UGNAYA code. Look for the UGNAYA sign at the counter.',
} as const;

/**
 * The customer's scanner: a shop's store code (`M:<merchant id>`) opens that shop. Points are never earned here (the cashier
 * scans the customer's code), so other codes get a clear word instead. Camera access is asked when the scanner opens, which
 * the customer chose to do; without it, a way to Settings.
 */
export function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const handled = useRef(false);
  const lastUnknown = useRef<string | null>(null);
  const undetermined = permission?.status === PermissionStatus.UNDETERMINED && permission.canAskAgain;

  useEffect(() => {
    if (undetermined) void requestPermission();
  }, [undetermined, requestPermission]);

  // Back from Settings with the camera allowed: the scanner opens.
  useEffect(() => {
    if (!permission || permission.granted) return;
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && void getPermission());
    return () => subscription.remove();
  }, [permission, getPermission]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
      lastUnknown.current = null;
    }, MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const onScanned = (data: string) => {
    if (handled.current) return;
    const result = readScan(data);
    if (result.kind === 'merchant') {
      handled.current = true;
      successFeedback();
      router.replace({ pathname: '/merchant/[id]', params: { id: result.merchantId } });
      return;
    }
    // The camera reports the same code many times a second: say it once.
    if (lastUnknown.current === data) return;
    lastUnknown.current = data;
    setMessage(NOT_A_SHOP[result.kind]);
  };

  const closeButton = <GlassIconButton icon="close" accessibilityLabel="Close scanner" appearance="dark" onPress={closeScreen} />;

  if (!permission) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator color={HeroInk.text} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="light" />
        <View style={[styles.corner, { top: insets.top + Spacing.two }]}>{closeButton}</View>
        <View style={styles.permission}>
          <ThemedText type="section" style={styles.ink}>
            Allow the camera to scan
          </ThemedText>
          <ThemedText type="body" style={[styles.ink, styles.muted]}>
            UGNAYA uses the camera only to read a shop’s code while the scanner is open. Nothing is recorded.
          </ThemedText>
          {permission.canAskAgain ? (
            <Button title="Allow camera" icon="photo_camera" material="solid" onPress={() => void requestPermission()} />
          ) : (
            <Button title="Open Settings" icon="settings" material="solid" onPress={() => void Linking.openSettings()} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => onScanned(data)} />
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
        {closeButton}
        <GlassIconButton
          icon={torch ? 'flashlight_on' : 'flashlight_off'}
          accessibilityLabel="Flashlight"
          accessibilityRole="switch"
          accessibilityState={{ checked: torch }}
          appearance="dark"
          onPress={() => setTorch((on) => !on)}
        />
      </View>
      <View style={styles.guide} pointerEvents="none">
        <GlassSurface appearance="dark" style={styles.hint} fallbackStyle={styles.hintFallback}>
          <ThemedText type="bodySemiBold" style={styles.ink} accessibilityLiveRegion="polite">
            {message ?? HINT}
          </ThemedText>
        </GlassSurface>
        <View style={styles.frame} />
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
        <ThemedText type="secondary" style={[styles.ink, styles.muted]}>
          To earn points, show your own code to the cashier instead.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PhotoBackdrop,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    left: Spacing.three,
  },
  permission: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  guide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  hint: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.large,
    maxWidth: 360,
  },
  hintFallback: {
    backgroundColor: HeroInk.chip,
  },
  frame: {
    width: `${FRAME_SHARE * 100}%`,
    aspectRatio: 1,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: HeroInk.glassBorder,
  },
  ink: {
    color: HeroInk.text,
    textAlign: 'center',
  },
  muted: {
    color: HeroInk.muted,
  },
  footer: {
    paddingHorizontal: Spacing.five,
  },
});
