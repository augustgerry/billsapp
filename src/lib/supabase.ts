import 'react-native-url-polyfill/auto';

import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * expo-secure-store rejects large values on some iOS versions (~2 KB). A
 * Supabase session (access + refresh JWT) can exceed that, so we transparently
 * split it across numbered keys. `<key>` holds the chunk count; `<key>.<n>`
 * holds each slice. A plain (non-numeric) value at `<key>` is treated as a
 * legacy single write and returned as-is.
 */
const CHUNK_SIZE = 1800;

async function clearChunks(key: string): Promise<void> {
  const meta = await SecureStore.getItemAsync(key);
  const count = meta == null ? 0 : Number(meta);
  if (Number.isInteger(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(`${key}.${i}`),
      ),
    );
  }
  await SecureStore.deleteItemAsync(key);
}

const chunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const meta = await SecureStore.getItemAsync(key);
    if (meta == null) return null;
    const count = Number(meta);
    if (!Number.isInteger(count)) return meta; // legacy single value
    let out = '';
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part == null) return null; // torn write — treat as absent
      out += part;
    }
    return out;
  },

  async setItem(key: string, value: string): Promise<void> {
    await clearChunks(key);
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await Promise.all(
      chunks.map((chunk, i) =>
        SecureStore.setItemAsync(`${key}.${i}`, chunk),
      ),
    );
    await SecureStore.setItemAsync(key, String(chunks.length));
  },

  async removeItem(key: string): Promise<void> {
    await clearChunks(key);
  },
};

// createClient throws on an empty URL, so fall back to a placeholder when the
// project is unconfigured. `isSupabaseConfigured` gates the UI before any call.
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'public-anon-key-placeholder',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : chunkedSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export { isSupabaseConfigured };

// Refresh the session only while the app is foregrounded (Supabase + Expo guide).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
