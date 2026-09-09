/**
 * Public runtime config. Expo inlines any `EXPO_PUBLIC_*` env var at build time
 * (from `.env`, `.env.local`, or the shell). These are shipped in the bundle —
 * only the Supabase URL + anon key belong here, never a service-role key.
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** False until `.env` is filled in — the app shows a setup screen instead of crashing. */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;
