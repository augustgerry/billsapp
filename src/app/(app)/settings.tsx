import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useLocale } from '@/features/settings/locale';
import { useThemePreference } from '@/features/settings/theme-preference';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const { email, wa, signOut } = useAuth();
  const { pref, setPref } = useThemePreference();
  const { lang, setLang, t } = useLocale();
  const c = useTheme();

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText themeColor="textFaint" style={styles.label}>
        {t('settings.account')}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <View style={[styles.row, { borderTopColor: c.border }]}>
          <ThemedText themeColor="textSecondary">{t('common.email')}</ThemedText>
          <ThemedText>{email ?? '-'}</ThemedText>
        </View>
        <View style={[styles.row, { borderTopColor: c.border }]}>
          <ThemedText themeColor="textSecondary">{t('settings.phone')}</ThemedText>
          <ThemedText>{wa ?? '-'}</ThemedText>
        </View>
      </View>

      <ThemedText themeColor="textFaint" style={styles.label}>
        {t('settings.appearance')}
      </ThemedText>
      <Segmented
        options={[
          { label: t('settings.themeLight'), value: 'light' },
          { label: t('settings.themeDark'), value: 'dark' },
          { label: t('settings.themeSystem'), value: 'system' },
        ]}
        value={pref}
        onChange={setPref}
      />

      <ThemedText themeColor="textFaint" style={styles.label}>
        {t('settings.language')}
      </ThemedText>
      <Segmented
        options={[
          { label: t('settings.langId'), value: 'id' },
          { label: t('settings.langEn'), value: 'en' },
        ]}
        value={lang}
        onChange={setLang}
      />

      <View style={styles.spacer} />
      <Button
        label={t('settings.signOut')}
        variant="danger"
        onPress={() => void signOut()}
      />
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
