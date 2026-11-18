import { router } from 'expo-router';

/**
 * Closes the current screen. Falls back to Home when there's nothing underneath, e.g. a sheet
 * restored on its own after a reload, where `router.back()` would do nothing.
 */
export function closeScreen(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
