import type { ReactNode } from 'react';
import { ButtonLink, Container } from '@ugnaya/web-ui';

export type CtaBandProps = {
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Shown beside the text from 768 px, standing on the band's bottom edge (e.g. Ugi celebrating). */
  illustration?: ReactNode;
};

/** The closing call to action: the one full-bleed navy band on a page. */
export function CtaBand({ title, body, primary, secondary, illustration }: CtaBandProps) {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-xl bg-primary px-6 py-12 text-on-primary sm:px-12">
          {illustration && (
            <div className="pointer-events-none absolute bottom-0 right-6 hidden md:block lg:right-14" aria-hidden="true">
              {illustration}
            </div>
          )}
          <div className={illustration ? 'md:pr-56 lg:pr-64' : undefined}>
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-3 max-w-2xl text-lg opacity-90">{body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={primary.href} size="lg" variant="reward">
                {primary.label}
              </ButtonLink>
              {secondary && (
                <ButtonLink href={secondary.href} size="lg" variant="onPrimary">
                  {secondary.label}
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
