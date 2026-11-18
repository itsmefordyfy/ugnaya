import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { HeaderControl } from '@/components/ui/header-control';
import type { IconName } from '@/components/ui/icon';
import type { ThemeColor } from '@/constants/theme';

export type HeaderIconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  color?: ThemeColor;
  onPress: () => void;
};

/**
 * An icon action in a native stack header: the app's one round button (GlassIconButton), the same
 * as the back button. On iOS 26 place it with the system's shared glass hidden
 * (`hidesSharedBackground`), so there's one circle, not glass inside glass.
 */
export function HeaderIconButton({ icon, accessibilityLabel, color = 'text', onPress }: HeaderIconButtonProps) {
  return (
    <HeaderControl>
      <GlassIconButton icon={icon} color={color} accessibilityLabel={accessibilityLabel} onPress={onPress} />
    </HeaderControl>
  );
}
