import * as Haptics from 'expo-haptics';

/** Light tap feedback for primary actions. iOS only, where it feels native; a no-op elsewhere. */
export function tapFeedback(): void {
  if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** A success buzz for a moment worth marking (a record saved). iOS only, like tapFeedback. */
export function successFeedback(): void {
  if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
