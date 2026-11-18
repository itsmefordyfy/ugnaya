import { Container } from '@ugnaya/web-ui';
import { Prose } from '@/components/ui/prose';

export type LegalPageProps = { title: string; updated: string; markdown: string };

export function LegalPage({ title, updated, markdown }: LegalPageProps) {
  return (
    <article className="py-16">
      <Container>
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated {updated}</p>
        <div className="mt-8">
          <Prose markdown={markdown} />
        </div>
        <p className="mt-12 max-w-3xl rounded-md border border-border bg-card p-4 text-sm text-ink-muted">
          Draft, pending review by counsel. This text will change before UGNAYA launches.
        </p>
      </Container>
    </article>
  );
}
