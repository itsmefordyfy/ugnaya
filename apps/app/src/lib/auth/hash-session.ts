/**
 * Some Supabase links (for example a resent confirmation) return the session after the `#` instead of as a
 * `code`. The server never sees a fragment, so the browser reads it with this. An expired or used link puts
 * an `error` there instead and gives no session.
 */
export function sessionFromHash(hash: string): { accessToken: string; refreshToken: string } | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  return accessToken && refreshToken && !params.get('error') ? { accessToken, refreshToken } : null;
}
