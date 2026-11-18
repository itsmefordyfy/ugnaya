import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { secureGet, secureSet } from '@/lib/secure-storage';

import { askAndRegister, type PushSetup } from '@/lib/push';

const DISMISSED_KEY = 'ugnaya.pushPromptDismissed';

/**
 * Whether Home shows the "Know when points arrive" card: only while the system hasn't asked yet and the customer hasn't said
 * "Not now". The system prompt comes only from the card's button, after the app has said why.
 */
export function usePushPrompt() {
  const queryClient = useQueryClient();
  const state = useQuery({
    queryKey: ['push-prompt'],
    queryFn: async () => {
      const [permission, dismissed] = await Promise.all([Notifications.getPermissionsAsync(), secureGet(DISMISSED_KEY)]);
      return { undetermined: permission.status === 'undetermined', dismissed: dismissed === '1' };
    },
    staleTime: Infinity,
  });
  const done = () => void queryClient.invalidateQueries({ queryKey: ['push-prompt'] });
  return {
    visible: !!state.data && state.data.undetermined && !state.data.dismissed,
    allow: async (): Promise<PushSetup> => {
      const result = await askAndRegister().catch((): PushSetup => 'undetermined');
      done();
      return result;
    },
    dismiss: async () => {
      await secureSet(DISMISSED_KEY, '1');
      done();
    },
  };
}
