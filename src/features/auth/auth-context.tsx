/**
 * Auth state for Kongsi, backed by Supabase Auth.
 *
 * Flow mirrors the prototype:
 *   register (email, password, WA)  ->  6-digit code by email  ->  verified session
 *   returning users: email + password
 *
 * The WhatsApp number is carried in `user_metadata.wa` at sign-up and copied
 * into `public.profiles` once the session exists.
 *
 * Wire it in `src/app/_layout.tsx`:  <AuthProvider>{...}</AuthProvider>
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { registerPushToken } from '@/features/notifications/push';
import { supabase } from '@/lib/supabase';

export interface SignUpInput {
  email: string;
  password: string;
  /** Digits only, e.g. "08123456789". */
  wa: string;
}

interface AuthContextValue {
  /** True until the persisted session has been read once. */
  initializing: boolean;
  session: Session | null;
  user: User | null;
  /** Lowercased email of the signed-in user, or null. The identity key. */
  email: string | null;
  wa: string | null;

  /**
   * Creates the account. Returns `{ needsVerification: true }` when Supabase is
   * configured to require email confirmation (the normal case) — the caller
   * then collects the code and calls `verifyEmail`.
   */
  signUp(input: SignUpInput): Promise<{ needsVerification: boolean }>;
  /** Confirms a sign-up with the 6-digit code emailed to `email`. */
  verifyEmail(input: { email: string; token: string }): Promise<void>;
  /** Re-sends the sign-up confirmation code. */
  resendCode(email: string): Promise<void>;
  signIn(input: { email: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Throw a plain Error from a Supabase `{ error }` result. */
function throwOnError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function syncProfile(user: User | null): Promise<void> {
  if (!user) return;
  const wa =
    typeof user.user_metadata?.wa === 'string' ? user.user_metadata.wa : null;
  if (!wa) return;
  // Idempotent: RLS lets a user upsert only their own row.
  await supabase.from('profiles').upsert({ id: user.id, wa }, { onConflict: 'id' });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Keep `public.profiles` + the push token in step with the session (once per user id).
  useEffect(() => {
    const user = session?.user ?? null;
    if (user && syncedFor.current !== user.id) {
      syncedFor.current = user.id;
      void syncProfile(user);
      void registerPushToken(user.id);
    }
    if (!user) syncedFor.current = null;
  }, [session]);

  const signUp = useCallback(
    async ({ email, password, wa }: SignUpInput) => {
      const { data, error } = await supabase.auth.signUp({
        email: normaliseEmail(email),
        password,
        options: { data: { wa: wa.trim() } },
      });
      throwOnError(error);
      return { needsVerification: data.session == null };
    },
    [],
  );

  const verifyEmail = useCallback(
    async ({ email, token }: { email: string; token: string }) => {
      const { error } = await supabase.auth.verifyOtp({
        email: normaliseEmail(email),
        token: token.trim(),
        type: 'signup',
      });
      throwOnError(error);
    },
    [],
  );

  const resendCode = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normaliseEmail(email),
    });
    throwOnError(error);
  }, []);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: normaliseEmail(email),
        password,
      });
      throwOnError(error);
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    throwOnError(error);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    return {
      initializing,
      session,
      user,
      email: user?.email ? user.email.toLowerCase() : null,
      wa: typeof user?.user_metadata?.wa === 'string' ? user.user_metadata.wa : null,
      signUp,
      verifyEmail,
      resendCode,
      signIn,
      signOut,
    };
  }, [initializing, session, signUp, verifyEmail, resendCode, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
