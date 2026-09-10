import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// the transparent "split ring" mark — same shape as the app icon
const MARK = require('@/assets/images/splash-icon.png');

/** Kongsi lockup: the split-ring mark in the brand yellow + the wordmark. */
export function Wordmark({ size = 24 }: { size?: number }) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <Image
        source={MARK}
        style={{ width: size * 0.9, height: size * 0.9 }}
        contentFit="contain"
        tintColor={c.primary}
      />
      <ThemedText style={[styles.name, { fontSize: size }]}>Kongsi</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontWeight: '800', letterSpacing: -0.5 },
});
