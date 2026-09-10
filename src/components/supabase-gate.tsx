import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useT } from '@/features/settings/locale';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Blocks the app with a setup message until `.env` has the Supabase URL + anon
 * key. See docs/SUPABASE_SETUP.md.
 */
export function SupabaseGate({ children }: { children: ReactNode }) {
  const c = useTheme();
  const t = useT();
  if (isSupabaseConfigured) return <>{children}</>;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]}>
      <View style={styles.box}>
        <Text style={[styles.title, { color: c.text }]}>{t('gate.title')}</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          {t('gate.body')}
        </Text>
        <Text style={[styles.body, { color: c.textFaint }]}>{t('gate.hint')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  box: { padding: Spacing.four, gap: Spacing.three, maxWidth: 460 },
  title: { fontSize: 20, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
});
