import { describe, expect, it } from 'vitest';
import { resolveSupabaseConfig } from '../src/lib/supabase';

describe('Vitest setup', () => {
  it('runs a basic test successfully', () => {
    expect(1 + 1).toBe(2);
  });
});

describe('Supabase configuration', () => {
  it('uses safe defaults when local env vars are missing', () => {
    expect(resolveSupabaseConfig({})).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'demo-anon-key',
    });
  });
});