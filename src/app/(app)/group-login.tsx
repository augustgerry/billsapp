import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/features/auth/auth-context';
import { markGroupUnlocked } from '@/features/groups/unlocked-groups';
import { useT } from '@/features/settings/locale';
import type { Group } from '@/types/models';
import { fetchGroup } from '@/lib/groups-repository';
import { touchRecentGroup } from '@/lib/recent-groups-repository';

export default function GroupLoginScreen() {
  const { groupId = '', name } = useLocalSearchParams<{
    groupId?: string;
    name?: string;
  }>();
  const { email } = useAuth();
  const t = useT();
  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchGroup(groupId)
      .then((g) => active && setGroup(g))
      .catch((e: unknown) => active && setLoadError(String(e)));
    return () => {
      active = false;
    };
  }, [groupId]);

  if (loadError) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ThemedText type="subtitle">{name ?? t('nav.group')}</ThemedText>
        <ThemedText themeColor="danger">{t('groupLogin.loadError')}</ThemedText>
      </Screen>
    );
  }

  if (!group) return <LoadingScreen />;

  const member = group.members.find(
    (m) => m.email.toLowerCase() === (email ?? '').toLowerCase(),
  );

  if (!member || member.status === 'pending') {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ThemedText type="subtitle">{group.name}</ThemedText>
        <ThemedText themeColor="danger">
          {member?.status === 'pending'
            ? t('groupLogin.pendingInvite')
            : t('groupLogin.notMember', { email: email ?? '-' })}
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
        router.replace({
          pathname: '/(app)/group/[id]',
          params: { id: groupId },
        });
      } else {
        setPinError(t('groupLogin.pinWrong'));
        setPin('');
      }
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText type="subtitle">
        {t('groupLogin.title', { name: group.name })}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {t('groupLogin.as', { name: member.name })}
      </ThemedText>
      <TextField
        label={t('groupLogin.pinLabel')}
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
