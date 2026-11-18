import type { UgiPose } from '@ugnaya/brand';
import { Container, Ugi } from '@ugnaya/web-ui';

const MOMENTS: { pose: UgiPose; title: string; body: string }[] = [
  { pose: 'happy', title: 'Cheers you on', body: 'When points land in your wallet.' },
  { pose: 'wink', title: 'Shares tips', body: 'Like which reward you’re closest to.' },
  { pose: 'thinking', title: 'Helps you out', body: 'When something needs a second look.' },
  { pose: 'celebrating', title: 'Celebrates with you', body: 'Every time you claim a reward.' },
];

/** Introduces the mascot once, on the home page: who Ugi is and when you'll see him. */
export function MeetUgi() {
  return (
    <section aria-labelledby="meet-ugi" className="overflow-hidden py-16 sm:py-20">
      <Container className="grid items-center gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16">
        <div className="flex justify-center">
          <Ugi pose="helpful" height={240} alt="Ugi, the UGNAYA Assistant, holding a tablet with the UGNAYA symbol" />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Meet Ugi</p>
          <h2 id="meet-ugi" className="text-3xl font-bold tracking-tight sm:text-4xl">Your friendly guide to earning and redeeming</h2>
          <p className="mt-4 max-w-xl text-lg text-ink-muted">
            Ugi is the UGNAYA Assistant. You’ll find him in the app when there’s something worth knowing, never in the way.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {MOMENTS.map((moment) => (
              <li key={moment.pose} className="flex items-center gap-3">
                <span className="inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-primary-soft">
                  <Ugi pose={moment.pose} height={60} />
                </span>
                <span>
                  <span className="block font-semibold">{moment.title}</span>
                  <span className="block text-sm text-ink-muted">{moment.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
