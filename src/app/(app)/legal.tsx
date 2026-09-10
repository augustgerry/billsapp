import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { legalDoc, type LegalDoc } from '@/features/legal/content';
import { useLocale } from '@/features/settings/locale';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const { lang } = useLocale();
  const which: LegalDoc = doc === 'terms' ? 'terms' : 'privacy';
  const content = legalDoc(lang, which);

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: content.title }} />
      <ThemedText type="subtitle">{content.title}</ThemedText>
      <ThemedText themeColor="textFaint" style={styles.effective}>
        {content.effective}
      </ThemedText>
      {content.sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <ThemedText style={styles.heading}>{s.heading}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.body}>
            {s.body}
          </ThemedText>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  effective: { fontSize: 12, marginTop: -Spacing.two },
  section: { gap: Spacing.one, marginTop: Spacing.two },
  heading: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21 },
});
