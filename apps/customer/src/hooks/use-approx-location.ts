import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

import type { Coords } from '@/api/customer';

/** About 100 m: enough to sort shops by distance, without sending the customer's exact spot. */
const round = (value: number) => Math.round(value * 1000) / 1000;

async function currentCoords(): Promise<Coords> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000, requiredAccuracy: 1000 });
  const position = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { lat: round(position.coords.latitude), lng: round(position.coords.longitude) };
}

/**
 * The customer's approximate location for "near you", only once they allowed it (while using the app). Without permission,
 * or if the phone can't tell, it's null and the lists sort by name: the app never needs location to work.
 */
export function useApproxLocation() {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const granted = permission?.granted ?? false;
  const coords = useQuery({
    queryKey: ['location'],
    queryFn: () => currentCoords().catch(() => null),
    enabled: granted,
    staleTime: 5 * 60_000,
    retry: false,
  });

  /** Asks after the app has explained why (the caller shows the explanation); points to Settings if it was turned down before. */
  const ask = async () => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      Alert.alert('Location is off for UGNAYA', 'To see shops near you, allow location for UGNAYA in Settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    await requestPermission();
  };

  return {
    /** Null: not asked yet; the app shows its explanation before the system prompt. */
    status: permission ? (permission.granted ? 'granted' : permission.canAskAgain ? 'undetermined' : 'denied') : null,
    coords: granted ? (coords.data ?? null) : null,
    locating: granted && coords.isPending,
    ask,
  } as const;
}
