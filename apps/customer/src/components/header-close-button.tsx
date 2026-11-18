import { HeaderIconButton } from '@/components/header-icon-button';
import { useStrings } from '@/hooks/use-strings';

export type HeaderCloseButtonProps = {
  onPress: () => void;
  /** What it does, for screen readers: Close by default, Cancel for a form that discards its edits. */
  accessibilityLabel?: string;
  /** `back` for a step back inside the sheet (Sam's history → the chat), in the same place and style as the X. */
  icon?: 'close' | 'back';
};

/**
 * The X that closes a sheet (owner's call, 2026-10-17: an icon, not a "Cancel" or "Close" word): the
 * app's one round button, the same as the back button. Place it with `headerCloseOptions`, not as a
 * plain `headerRight`: on iOS 26 the header draws its own glass around whatever it's given, and that
 * capsule is wider than tall, which made the X an oval (2026-11-04).
 */
export function HeaderCloseButton({ onPress, accessibilityLabel, icon = 'close' }: HeaderCloseButtonProps) {
  const strings = useStrings();
  const label = accessibilityLabel ?? (icon === 'back' ? strings.common.back : strings.common.close);
  return <HeaderIconButton icon={icon === 'back' ? 'arrow_back_ios_new' : 'close'} accessibilityLabel={label} onPress={onPress} />;
}

/**
 * Screen options that put the close button in a sheet's header. iOS gets it as a custom item with
 * the system's shared glass hidden (the back button does the same, see useStackHeaderOptions), so
 * the one circle is the button's own; Android's header draws nothing, so a plain header slot is enough.
 */
export function headerCloseOptions(props: HeaderCloseButtonProps, side: 'left' | 'right' = 'right') {
  const button = <HeaderCloseButton {...props} />;
  if (process.env.EXPO_OS === 'ios') {
    const items = () => [{ type: 'custom' as const, element: button, hidesSharedBackground: true }];
    return side === 'left' ? { unstable_headerLeftItems: items } : { unstable_headerRightItems: items };
  }
  return side === 'left' ? { headerLeft: () => button } : { headerRight: () => button };
}
