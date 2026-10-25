
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type Session = {
  userId: string;
  email: string;
  accessToken: string | null;
} | null;

type AuthCtx = {
  session: Session;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function toAppSession(value: SupabaseSession | null): Session {
  if (!value) return null;

  return {
    userId: value.user.id,
    email: value.user.email ?? '',
    accessToken: value.access_token,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, value) => {
      setSession(toAppSession(value));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (!data.session) {
      throw new Error(
        'Your account was created. Check your email to confirm it, then log in.'
      );
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <Ctx.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const context = useContext(Ctx);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
