import { ICON_PATHS, type IconName } from './icon-paths';

export type { IconName };

export type IconProps = {
  name: IconName;
  /** Pixels; defaults to 24. */
  size?: number;
  className?: string;
  /** A label for an icon that means something on its own; decorative icons have none. */
  label?: string;
};

/** A Material Symbols Rounded icon, inline, coloured by currentColor. */
export function Icon({ name, size = 24, className, label }: IconProps) {
  return (
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
