export type PhoneMockupProps = {
  title: string;
  lines: string[];
  className?: string;
};

/** A phone frame holding a labelled placeholder for a real screenshot of the app. */
export function PhoneMockup({ title, lines, className }: PhoneMockupProps) {
  return (
    <figure
      className={`mx-auto w-full max-w-[280px] rounded-[40px] border-[10px] border-ink bg-card p-5 shadow-xl ${className ?? ''}`}
      aria-label={`Illustration placeholder: ${title}`}
    >
      <div className="mx-auto mb-5 h-1.5 w-16 rounded-pill bg-border" />
      <figcaption className="mb-4 text-lg font-bold">{title}</figcaption>
      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={line} className="rounded-md bg-surface px-3 py-2.5 text-sm text-ink-muted">
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-xs text-ink-muted">Screen preview</p>
    </figure>
  );
}
