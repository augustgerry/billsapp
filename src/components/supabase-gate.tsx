import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Blocks the app with a setup message until `.env` has the Supabase URL + anon
 * key. See docs/SUPABASE_SETUP.md.
 */
export function SupabaseGate({ children }: { children: ReactNode }) {
  const c = useTheme();
  if (isSupabaseConfigured) return <>{children}</>;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]}>
      <View style={styles.box}>
        <Text style={[styles.title, { color: c.text }]}>
          Supabase belum dikonfigurasi
        </Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          Salin <Text style={styles.mono}>.env.example</Text> ke{' '}
          <Text style={styles.mono}>.env</Text>, isi{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_URL</Text> dan{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text> dari
          dashboard Supabase, lalu restart{' '}
          <Text style={styles.mono}>npm start</Text>.
        </Text>
        <Text style={[styles.body, { color: c.textFaint }]}>
          Langkah lengkap: docs/SUPABASE_SETUP.md
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  box: { padding: Spacing.four, gap: Spacing.three, maxWidth: 460 },
  title: { fontSize: 20, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  mono: { fontFamily: 'monospace' },
});
