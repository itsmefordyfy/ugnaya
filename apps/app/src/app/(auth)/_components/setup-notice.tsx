/**
 * Shown instead of a form when the site can't reach Supabase (the two public values in apps/web/.env.local
 * are missing). Developers get the exact fix; visitors in production get a plain message.
 */
export function SetupNotice() {
  const dev = process.env.NODE_ENV === 'development';
  return (
    <div role="alert" className="rounded-lg border border-warning bg-warning-soft p-5 text-warning-text">
      <p className="font-semibold">{dev ? 'Sign-in isn’t set up on this machine yet' : 'Sign-in is temporarily unavailable'}</p>
      {dev ? (
        <p className="mt-2 text-sm">
          Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to{' '}
          <code className="font-mono">apps/web/.env.local</code> (the key is in Supabase → Project Settings → API Keys), then
          restart <code className="font-mono">npm run web</code>.
        </p>
      ) : (
        <p className="mt-2 text-sm">Please try again in a few minutes, or email us and we’ll help you register.</p>
      )}
    </div>
  );
}
