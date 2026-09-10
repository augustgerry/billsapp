import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { toTitleCase } from '@/domain/text';
import { useAuth } from '@/features/auth/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { createGroup } from '@/lib/groups-repository';
import { touchRecentGroup } from '@/lib/recent-groups-repository';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Row {
  name: string;
  email: string;
}

export default function CreateGroupScreen() {
  const { email: myEmail } = useAuth();
  const c = useTheme();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [rows, setRows] = useState<Row[]>([
    { name: '', email: myEmail ?? '' },
    { name: '', email: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filled = rows.filter((r) => r.name.trim() || r.email.trim());
  const membersOk =
    filled.length >= 2 &&
    filled.every((r) => r.name.trim() && EMAIL_RE.test(r.email.trim()));
  const valid = name.trim().length > 0 && /^\d{6}$/.test(pin) && membersOk;
  const includesMe = filled.some(
    (r) => r.email.trim().toLowerCase() === (myEmail ?? '').toLowerCase(),
  );

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    if (!valid || busy) return;
    if (!includesMe) {
      setError('Email kamu harus termasuk salah satu anggota.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await createGroup({
        name,
        pin,
        members: filled.map((r) => ({ name: r.name, email: r.email })),
      });
      await touchRecentGroup(groupId);
      router.replace({
        pathname: '/(app)/group-login',
        params: { groupId, name: name.trim() },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat grup');
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText themeColor="textSecondary">
        Untuk pasangan atau keluarga yang urus tagihan bareng.
      </ThemedText>

      <TextField
        label="Nama grup"
        value={name}
        onChangeText={(t) => setName(toTitleCase(t))}
        placeholder="Contoh: Rumah Kita"
      />

      <ThemedText themeColor="textSecondary" style={styles.label}>
        Anggota (min. 2) — nama & email dipakai buat login otomatis
      </ThemedText>
      {rows.map((row, i) => (
        <View
          key={i}
          style={[styles.memberCard, { borderColor: c.border }]}
        >
          {rows.length > 2 ? (
            <Pressable
              onPress={() => setRows((p) => p.filter((_, idx) => idx !== i))}
              style={styles.removeBtn}
            >
              <ThemedText themeColor="danger">✕</ThemedText>
            </Pressable>
          ) : null}
          <TextField
            placeholder="Nama anggota"
            value={row.name}
            onChangeText={(t) => setRow(i, { name: toTitleCase(t) })}
          />
          <TextField
            placeholder="Email anggota"
            value={row.email}
            onChangeText={(t) => setRow(i, { email: t.trim() })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>
      ))}
      <Button
        label="+ Tambah anggota"
        variant="ghost"
        onPress={() => setRows((p) => [...p, { name: '', email: '' }])}
      />

      <TextField
        label="PIN grup (6 digit, dipakai semua anggota buat masuk)"
        value={pin}
        onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        placeholder="123456"
        maxLength={6}
      />

      {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
      <Button label="Buat grup" onPress={submit} disabled={!valid} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginTop: Spacing.two },
  memberCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  removeBtn: { alignSelf: 'flex-end', padding: 4 },
});
