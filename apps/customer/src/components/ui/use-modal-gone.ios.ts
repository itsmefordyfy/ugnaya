/**
 * Returns the Modal's `onDismiss`, set to `onGone`. On iPhone that is the only safe moment: it
 * fires once UIKit has finished taking the Modal's view controller down. Anything presented before
 * then (a photo picker, a screen) is stacked on the Modal, and the Modal's dismissal takes that
 * down with it: the picker never shows and its promise never settles.
 */
export function useModalGone(_mounted: boolean, onGone: () => void): (() => void) | undefined {
  return onGone;
}
