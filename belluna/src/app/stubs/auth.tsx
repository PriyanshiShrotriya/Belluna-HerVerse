// STUB — temporary. Member 2's Supabase auth provider replaces this file in Phase 3.
// Keep the same shape: { session, signIn, signUp, signOut } so swapping is a one-file change.
import { createContext, useContext, useState, type ReactNode } from 'react';

type Session = { email: string; accessToken: string | null } | null;
type AuthCtx = { session: Session; signIn: (e: string, p: string) => Promise<void>; signUp: (e: string, p: string) => Promise<void>; signOut: () => Promise<void> };
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const fake = async (email: string) => { await new Promise((r) => setTimeout(r, 400)); setSession({ email, accessToken: null }); };
  return (
    <Ctx.Provider value={{ session, signIn: (e) => fake(e), signUp: (e) => fake(e), signOut: async () => setSession(null) }}>
      {children}
    </Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);
