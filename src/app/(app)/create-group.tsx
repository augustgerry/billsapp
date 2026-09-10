import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { isValidEmail } from '@/domain/email';
import { toTitleCase } from '@/domain/text';
import { useAuth } from '@/features/auth/auth-context';
import { useT } from '@/features/settings/locale';
import { useTheme } from '@/hooks/use-theme';
import { createGroup } from '@/lib/groups-repository';
import { touchRecentGroup } from '@/lib/recent-groups-repository';

interface Row {
  name: string;
  email: string;
}

export default function CreateGroupScreen() {
  const { email: myEmail } = useAuth();
  const c = useTheme();
  const t = useT();
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
    filled.every((r) => r.name.trim() && isValidEmail(r.email));
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
      setError(t('create.needSelf'));
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
      setError(e instanceof Error ? e.message : t('create.failed'));
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText themeColor="textSecondary">{t('create.subtitle')}</ThemedText>

      <TextField
        label={t('create.groupName')}
        value={name}
        onChangeText={(v) => setName(toTitleCase(v))}
        placeholder={t('create.groupNamePlaceholder')}
      />

      <ThemedText themeColor="textSecondary" style={styles.label}>
        {t('create.membersLabel')}
      </ThemedText>
      {rows.map((row, i) => (
        <View key={i} style={[styles.memberCard, { borderColor: c.border }]}>
          {rows.length > 2 ? (
            <Pressable
              onPress={() => setRows((p) => p.filter((_, idx) => idx !== i))}
              style={styles.removeBtn}
            >
              <ThemedText themeColor="danger">✕</ThemedText>
            </Pressable>
          ) : null}
          <TextField
            placeholder={t('create.memberName')}
            value={row.name}
            onChangeText={(v) => setRow(i, { name: toTitleCase(v) })}
          />
          <TextField
            placeholder={t('create.memberEmail')}
            value={row.email}
            onChangeText={(v) => setRow(i, { email: v.trim() })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            error={
              row.email.trim().length > 0 && !isValidEmail(row.email)
                ? t('register.emailInvalid')
                : undefined
            }
          />
        </View>
      ))}
      <Button
        label={t('create.addMember')}
        variant="ghost"
        onPress={() => setRows((p) => [...p, { name: '', email: '' }])}
      />

      <TextField
        label={t('create.pinLabel')}
        value={pin}
        onChangeText={(v) => setPin(v.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        placeholder="123456"
        maxLength={6}
      />

      {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
      <Button
        label={t('create.submit')}
        onPress={submit}
        disabled={!valid}
        loading={busy}
      />
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
