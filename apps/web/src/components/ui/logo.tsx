export type LogoProps = {
  size?: number;
  wordmark?: boolean;
  className?: string;
};

/**
 * The "Linked U" (business plan section 12): two rounded arms, blue and mango, meeting at the
 * bottom of a U. A first version; a designer may replace it.
 */
export function Logo({ size = 32, wordmark = false, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
        <path d="M14 8v18a10 10 0 0 0 10 10h3" fill="none" stroke="var(--color-primary)" strokeWidth="7" strokeLinecap="round" />
        <path d="M34 8v18a10 10 0 0 1-10 10h-3" fill="none" stroke="var(--color-reward)" strokeWidth="7" strokeLinecap="round" />
        <circle cx="24" cy="36" r="3.5" fill="var(--color-primary)" />
      </svg>
      {wordmark && <span className="text-xl font-extrabold tracking-tight text-ink">UGNAYA</span>}
    </span>
  );
}
