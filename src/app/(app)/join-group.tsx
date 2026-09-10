import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/auth-context';
import {
  lookupGroupForJoin,
  respondToInvite,
  type JoinLookup,
} from '@/lib/groups-repository';
import { touchRecentGroup } from '@/lib/recent-groups-repository';

export default function JoinGroupScreen() {
  const { email } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notMember, setNotMember] = useState<string | null>(null);
  const [invite, setInvite] = useState<JoinLookup | null>(null);
  const [busy, setBusy] = useState(false);

  function goToGroup(found: { groupId: string; name: string }) {
    router.push({
      pathname: '/(app)/group-login',
      params: { groupId: found.groupId, name: found.name },
    });
  }

  async function submit() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setNotMember(null);
    setInvite(null);
    try {
      const found = await lookupGroupForJoin(trimmed);
      if (!found.memberName) {
        setNotMember(found.name);
      } else if (found.memberStatus === 'pending') {
        setInvite(found);
      } else {
        goToGroup(found);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kode tidak ditemukan');
    } finally {
      setBusy(false);
    }
  }

  async function acceptInvite() {
    if (!invite || busy) return;
    setBusy(true);
    try {
      await respondToInvite(invite.groupId, true);
      await touchRecentGroup(invite.groupId);
      goToGroup(invite);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menerima undangan');
    } finally {
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

      {invite ? (
        <>
          <ThemedText themeColor="textSecondary">
            Kamu diundang ke grup <ThemedText>{invite.name}</ThemedText> sebagai{' '}
            <ThemedText>{invite.memberName}</ThemedText>. Terima undangannya buat
            gabung.
          </ThemedText>
          <Button label="Terima & lanjut" onPress={acceptInvite} loading={busy} />
        </>
      ) : (
        <Button
          label="Buka grup"
          onPress={submit}
          disabled={code.trim().length === 0}
          loading={busy}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { letterSpacing: 2, fontWeight: '700' },
});
