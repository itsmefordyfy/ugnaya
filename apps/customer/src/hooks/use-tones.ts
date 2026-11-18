import { Tones } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The current mode's category tones (`ink` and `soft` for each). */
export function useTones() {
  const scheme = useColorScheme();
  return Tones[scheme === 'dark' ? 'dark' : 'light'];
}
