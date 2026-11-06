import { ButtonLink } from '@/components/ui/button-link';
import { Container } from '@/components/ui/container';

export type CtaBandProps = {
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

/** The closing call to action: brand blue, white text. */
export function CtaBand({ title, body, primary, secondary }: CtaBandProps) {
  return (
    <section className="py-16">
      <Container>
        <div className="rounded-xl bg-primary px-6 py-12 text-on-primary sm:px-12">
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
      </Container>
    </section>
  );
}
