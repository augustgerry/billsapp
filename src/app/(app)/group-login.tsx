import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/auth-context';
import { markGroupUnlocked } from '@/features/groups/unlocked-groups';
import type { Group } from '@/types/models';
import { fetchGroup } from '@/lib/groups-repository';
import { touchRecentGroup } from '@/lib/recent-groups-repository';

export default function GroupLoginScreen() {
  const { groupId = '', name } = useLocalSearchParams<{
    groupId?: string;
    name?: string;
  }>();
  const { email } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchGroup(groupId)
      .then((g) => active && setGroup(g))
      .catch(
        (e: unknown) =>
          active &&
          setLoadError(e instanceof Error ? e.message : 'Gagal memuat grup'),
      );
    return () => {
      active = false;
    };
  }, [groupId]);

  if (loadError) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ThemedText type="subtitle">{name ?? 'Grup'}</ThemedText>
        <ThemedText themeColor="danger">{loadError}</ThemedText>
      </Screen>
    );
  }

  if (!group) return <LoadingScreen />;

  const member = group.members.find(
    (m) => m.email.toLowerCase() === (email ?? '').toLowerCase(),
  );

  if (!member) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ThemedText type="subtitle">{group.name}</ThemedText>
        <ThemedText themeColor="danger">
          Email kamu ({email}) belum terdaftar sebagai anggota grup ini. Minta
          admin buat menambahkan email kamu ke daftar anggota.
        </ThemedText>
      </Screen>
    );
  }

  function onPinChange(next: string) {
    const digits = next.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(digits);
    setPinError(null);
    if (digits.length === 6) {
      if (digits === group!.pin) {
        markGroupUnlocked(groupId);
        void touchRecentGroup(groupId);
        router.replace({ pathname: '/(app)/group/[id]', params: { id: groupId } });
      } else {
        setPinError('PIN salah, coba lagi.');
        setPin('');
      }
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText type="subtitle">Masuk ke {group.name}</ThemedText>
      <ThemedText themeColor="textSecondary">
        Masuk sebagai {member.name}. Masukkan PIN grup.
      </ThemedText>
      <TextField
        label="PIN grup"
        value={pin}
        onChangeText={onPinChange}
        keyboardType="number-pad"
        placeholder="123456"
        maxLength={6}
        autoFocus
        error={pinError ?? undefined}
        style={styles.pin}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pin: { letterSpacing: 4, fontWeight: '700', fontSize: 20 },
});
