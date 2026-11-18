export type SkeletonProps = {
  /** Tailwind size classes that match the content it stands in for, e.g. "h-6 w-48". */
  className?: string;
};

/** A placeholder shaped like the final content. Motion stops under prefers-reduced-motion (globals.css). */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-border ${className ?? ''}`} />;
}
