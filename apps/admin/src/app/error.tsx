'use client';

import { buttonClasses } from '@ugnaya/web-ui';

/** Any page that fails to render: say so plainly and offer a retry. */
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="main" className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-ink-muted">Please try again. If it keeps happening, email hello@ugnaya.ph.</p>
      <button type="button" onClick={() => retry()} className={`${buttonClasses('primary')} mt-8`}>
        Try again
      </button>
    </main>
  );
}
