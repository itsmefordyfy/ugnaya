/**
 * The Content-Security-Policy for the admin portal, built per request with a fresh nonce (Next applies the nonce to its
 * own scripts when the policy is on the request). Strict on purpose: scripts only with the nonce, no framing, no
 * plugins, and the browser may talk only to this site and the Supabase project.
 */
export type CspInput = { nonce: string; development: boolean; supabaseUrl: string };

export function buildCsp({ nonce, development, supabaseUrl }: CspInput): string {
  const directives = [
    "default-src 'self'",
    // React uses eval in development only (to rebuild server stack traces); production never does.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    // Development only: Next's dev toolbar and error overlay inject styles without the nonce (a nonce would also make
    // browsers ignore 'unsafe-inline'). Production keeps style blocks behind the nonce.
    development ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    // Inline style="" attributes (component sizing) can't carry a nonce; scripts are still locked down.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseUrl}${development ? ' ws://localhost:* http://localhost:*' : ''}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ];
  if (!development) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
