import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useThemePreference } from '@/features/settings/theme-preference';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const { email, wa, signOut } = useAuth();
  const { pref, setPref } = useThemePreference();
  const c = useTheme();

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText themeColor="textFaint" style={styles.label}>
        AKUN
      </ThemedText>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <View style={[styles.row, { borderTopColor: c.border }]}>
          <ThemedText themeColor="textSecondary">Email</ThemedText>
          <ThemedText>{email ?? '-'}</ThemedText>
        </View>
        <View style={[styles.row, { borderTopColor: c.border }]}>
          <ThemedText themeColor="textSecondary">WhatsApp</ThemedText>
          <ThemedText>{wa ?? '-'}</ThemedText>
        </View>
      </View>

      <ThemedText themeColor="textFaint" style={styles.label}>
        TAMPILAN
      </ThemedText>
      <Segmented
        options={[
          { label: 'Terang', value: 'light' },
          { label: 'Gelap', value: 'dark' },
          { label: 'Ikuti Sistem', value: 'system' },
        ]}
        value={pref}
        onChange={setPref}
      />

      <View style={styles.spacer} />
      <Button label="Keluar" variant="danger" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  card: { borderRadius: 14, paddingHorizontal: Spacing.three },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  spacer: { flex: 1, minHeight: Spacing.four },
});
