import type { ReactNode } from 'react';
import { Container } from './container';

export type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  children?: ReactNode;
  tone?: 'surface' | 'card';
};

export function Section({ id, eyebrow, title, intro, children, tone = 'surface' }: SectionProps) {
  return (
    <section id={id} className={`py-16 sm:py-20 ${tone === 'card' ? 'bg-card' : ''}`}>
      <Container>
        {(eyebrow || title || intro) && (
          <header className="mb-10 max-w-2xl">
            {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>}
            {title && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>}
            {intro && <p className="mt-4 text-lg text-ink-muted">{intro}</p>}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
