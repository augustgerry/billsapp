import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { duplicateGroup } from '@/lib/groups-repository';
import {
  hideRecentGroup,
  listRecentGroups,
  touchRecentGroup,
  type RecentGroupItem,
} from '@/lib/recent-groups-repository';

export default function HomeScreen() {
  const { email } = useAuth();
  const c = useTheme();
  const [recents, setRecents] = useState<RecentGroupItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listRecentGroups()
      .then(setRecents)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Gagal memuat daftar grup'),
      );
  }, []);

  useFocusEffect(load);

  function openGroup(item: RecentGroupItem) {
    router.push({
      pathname: '/(app)/group-login',
      params: { groupId: item.groupId, name: item.name },
    });
  }

  function rowActions(item: RecentGroupItem) {
    Alert.alert(item.name, undefined, [
      {
        text: 'Duplikat',
        onPress: async () => {
          try {
            const { groupId } = await duplicateGroup(item.groupId);
            await touchRecentGroup(groupId);
            load();
          } catch (e) {
            Alert.alert('Gagal', e instanceof Error ? e.message : 'Coba lagi');
          }
        },
      },
      {
        text: 'Hapus dari daftar',
        style: 'destructive',
        onPress: async () => {
          try {
            await hideRecentGroup(item.groupId);
            load();
          } catch (e) {
            Alert.alert('Gagal', e instanceof Error ? e.message : 'Coba lagi');
          }
        },
      },
      { text: 'Batal', style: 'cancel' },
    ]);
  }

  return (
    <Screen>
      <View style={styles.topbar}>
        <ThemedText themeColor="textFaint" style={styles.email}>
          {email}
        </ThemedText>
        <Pressable
          onPress={() => router.push('/(app)/settings')}
          accessibilityRole="button"
        >
          <ThemedText themeColor="primaryText" style={styles.logout}>
            Pengaturan
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText type="subtitle">Kongsi</ThemedText>
      <ThemedText themeColor="textSecondary">
        Kelola tagihan rumah tangga bareng — siapa bayar apa, siapa belum setor.
      </ThemedText>

      {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

      {recents && recents.length > 0 ? (
        <View style={styles.section}>
          <ThemedText themeColor="textFaint" style={styles.sectionLabel}>
            LANJUTKAN
          </ThemedText>
          {recents.map((item) => (
            <Pressable
              key={item.groupId}
              onPress={() => openGroup(item)}
              onLongPress={() => rowActions(item)}
              style={({ pressed }) => [
                styles.recentRow,
                { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <ThemedText style={styles.recentName}>{item.name}</ThemedText>
              <ThemedText themeColor="textFaint" style={styles.recentCode}>
                {item.code}
              </ThemedText>
            </Pressable>
          ))}
          <ThemedText themeColor="textFaint" style={styles.hint}>
            Tekan lama untuk duplikat / hapus dari daftar.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText themeColor="textFaint" style={styles.sectionLabel}>
          MULAI BARU
        </ThemedText>
        <Button
          label="Buat grup rumah tangga baru"
          onPress={() => router.push('/(app)/create-group')}
        />
        <Button
          label="Buka grup dengan kode"
          variant="secondary"
          onPress={() => router.push('/(app)/join-group')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  email: { fontSize: 12, flexShrink: 1 },
  logout: { fontSize: 13, fontWeight: '700' },
  section: { gap: Spacing.two, marginTop: Spacing.two },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 12,
  },
  recentName: { fontSize: 15, fontWeight: '600', flex: 1 },
  recentCode: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  hint: { fontSize: 12 },
});
