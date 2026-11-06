export type GatedPath = '/app' | '/register' | '/login';
export type SessionState = { signedIn: boolean; hasMerchant: boolean };

/** Where a page should send the visitor instead, or null to show it. */
export function gateFor(path: GatedPath, state: SessionState): string | null {
  switch (path) {
    case '/app':
      return state.signedIn ? null : '/login?next=/app';
    case '/register':
      return state.signedIn && state.hasMerchant ? '/app' : null;
    case '/login':
      if (!state.signedIn) return null;
      return state.hasMerchant ? '/app' : '/register';
  }
}

/** A `next` parameter is followed only if it stays on this site (no open redirects). */
export function safeNext(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}
