import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button-link';
import { Logo } from '@/components/ui/logo';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Logo size={48} />
      <h1 className="mt-6 text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-ink-muted">The link may be old, or the page moved.</p>
      <Link href="/" className={`${buttonClasses('primary')} mt-8`}>
        Go to the home page
      </Link>
    </main>
  );
}
