import Image from 'next/image';
import { UGI_FILES, UGI_POSES, type UgiPose } from '@ugnaya/brand';

export type UgiProps = {
  pose?: UgiPose;
  /** Rendered height in pixels; the width follows the artwork. Keep it modest in product screens (64 to 160). */
  height: number;
  /** Describe Ugi only when the picture carries meaning; most uses are decorative (the default, alt=""). */
  alt?: string;
  priority?: boolean;
  className?: string;
};

/**
 * Ugi, the UGNAYA Assistant, from the master cut-outs in packages/brand/assets/mascot (copied into each app's
 * public/mascot by the brand build). Next serves them as resized WebP/AVIF. One component, so every screen shows
 * the same character the same way.
 */
/** Ugi is always still (owner's call, 2026-11-07: no mascot animation). */
export function Ugi({ pose = 'default', height, alt = '', priority, className }: UgiProps) {
  const art = UGI_POSES[pose];
  const width = Math.round((height * art.width) / art.height);
  return (
    <Image
      src={UGI_FILES[pose]}
      // 90, not the default 75: lower WebP quality makes soft transparent edges blocky. Allowed in each app's next.config.
      quality={90}
      width={width}
      height={height}
      alt={alt}
      priority={priority}
      // The height is fixed and the width follows the artwork, so neither the global `img { max-width: 100% }` nor a
      // flex parent can change one side alone (Next warns about that, and it would distort him).
      style={{ height, width: 'auto' }}
      className={`pointer-events-none shrink-0 select-none ${className ?? ''}`}
      draggable={false}
    />
  );
}
