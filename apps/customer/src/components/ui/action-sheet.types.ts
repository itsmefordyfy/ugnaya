import type { IconName } from './icon';

export type ActionSheetOption = {
  label: string;
  /** Shown beside the label. */
  icon?: IconName;
  /** Drawn in the danger color (a removal). */
  destructive?: boolean;
  /** Runs once the sheet has left the screen, so it may open a picker, an alert or a screen. */
  onPress: () => void;
};

export type ActionSheetProps = {
  visible: boolean;
  /** What the choices are about, above them. */
  title?: string;
  options: readonly ActionSheetOption[];
  /** Called when the sheet goes away, after a choice or on Cancel. */
  onClose: () => void;
};
