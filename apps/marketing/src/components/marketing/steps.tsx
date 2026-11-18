import { Icon, type IconName } from '@ugnaya/web-ui';

export type Step = { icon: IconName; title: string; body: string };
export type StepsProps = { steps: Step[] };

/** Numbered steps in a row on wide screens, a column on phones: a rule and a number, not a card each. */
export function Steps({ steps }: StepsProps) {
  return (
    <ol className="grid gap-6 md:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className="border-t-2 border-primary pt-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-pill bg-primary text-on-primary">
              <Icon name={step.icon} size={22} />
            </span>
            <span className="text-sm font-semibold text-ink-muted">Step {index + 1}</span>
          </div>
          <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
          <p className="mt-2 text-ink-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
