
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://example.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'demo-anon-key';

export function resolveSupabaseConfig(
  env: Record<string, string | undefined> = import.meta.env
) {
  const supabaseUrl =
    env.VITE_SUPABASE_URL || env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return { supabaseUrl, supabaseAnonKey };
}

const { supabaseUrl, supabaseAnonKey } = resolveSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
