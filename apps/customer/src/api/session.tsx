import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: Session; userId: string; email: string | null };

const AuthContext = createContext<AuthState>({ status: 'loading' });

function stateFor(session: Session | null): AuthState {
  if (!session) return { status: 'signedOut' };
  return { status: 'signedIn', session, userId: session.user.id, email: session.user.email ?? null };
}

/**
 * The signed-in customer, from Supabase Auth's own session (kept in the Keychain). Everything signed-in reads `useMe()`; the
 * root layout reads the status to pick the welcome, onboarding or the app.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(
      ({ data }) => active && setState(stateFor(data.session)),
      () => active && setState({ status: 'signedOut' }),
    );
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Token refreshes change the session object but not who is signed in: keep the same state then, so screens don't re-render.
      setState((current) => (current.status === 'signedIn' && session && current.userId === session.user.id && current.session.access_token === session.access_token ? current : stateFor(session)));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  return use(AuthContext);
}

/** The signed-in customer's id. Only for screens behind the signed-in guard. */
export function useMe(): string {
  const state = useAuth();
  if (state.status !== 'signedIn') throw new Error('useMe outside the signed-in app');
  return state.userId;
}

export function useMyEmail(): string | null {
  const state = useAuth();
  return state.status === 'signedIn' ? state.email : null;
}
