import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export type HeaderControlProps = { children: ReactNode };

/**
 * Room around a frosted control in a native screen header. Android sizes each header slot to its
 * content and clips anything outside it, which cut a button's soft shadow off square at its edges.
 */
export function HeaderControl({ children }: HeaderControlProps) {
  // collapsable={false}: a view that only adds padding is otherwise merged away on Android, and the
  // room with it.
  return (
    <View collapsable={false} style={styles.room}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  room: {
    padding: 5,
    // Android's header bar is taller on tablets (64dp vs 56dp) and can stretch this slot to its
    // height; centering keeps the button in the middle of the bar instead of at its top.
    alignItems: 'center',
    justifyContent: 'center',
  },
});
