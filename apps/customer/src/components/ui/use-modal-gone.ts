import { useEffect, useEffectEvent } from 'react';

/**
 * Runs `onGone` once the Modal (shown while `mounted`) has unmounted. React Native calls a
 * Modal's `onDismiss` on iPhone only; Android's dialog is closed as soon as it's hidden, and the
 * pickers it opens are activities that don't depend on it. Returns no `onDismiss` here.
 */
export function useModalGone(mounted: boolean, onGone: () => void): (() => void) | undefined {
  const gone = useEffectEvent(onGone);
  useEffect(() => {
    if (!mounted) gone();
  }, [mounted]);
  return undefined;
}
