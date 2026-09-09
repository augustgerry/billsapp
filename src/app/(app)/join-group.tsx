import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/auth-context';
import { lookupGroupForJoin } from '@/lib/groups-repository';

export default function JoinGroupScreen() {
  const { email } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notMember, setNotMember] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setNotMember(null);
    try {
      const found = await lookupGroupForJoin(trimmed);
      if (!found.memberName) {
        setNotMember(found.name);
        setBusy(false);
        return;
      }
      router.push({
        pathname: '/(app)/group-login',
        params: { groupId: found.groupId, name: found.name },
      });
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kode tidak ditemukan');
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText themeColor="textSecondary">
        Masukkan kode grup yang dibagikan admin.
      </ThemedText>
      <TextField
        label="Kode grup"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Contoh: 7XQP2"
        maxLength={8}
        returnKeyType="go"
        onSubmitEditing={submit}
        error={error ?? undefined}
        style={styles.code}
      />
      {notMember ? (
        <ThemedText themeColor="danger">
          Email kamu ({email}) belum terdaftar sebagai anggota grup {notMember}.
          Minta admin buat menambahkan email kamu.
        </ThemedText>
      ) : null}
      <Button
        label="Buka grup"
        onPress={submit}
        disabled={code.trim().length === 0}
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { letterSpacing: 2, fontWeight: '700' },
});
