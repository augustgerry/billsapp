import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ActionSheet } from '@/components/ui/action-sheet';
import { Button } from '@/components/ui/button';
import { PromptDialog } from '@/components/ui/prompt-dialog';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useInvitesRealtime } from '@/features/groups/use-invites-realtime';
import { useLocale } from '@/features/settings/locale';
import { useTheme } from '@/hooks/use-theme';
import { countGroupAttention } from '@/lib/attention-repository';
import {
  duplicateGroup,
  listInvites,
  respondToInvite,
  type Invite,
} from '@/lib/groups-repository';
import {
  hideRecentGroup,
  listRecentGroups,
  touchRecentGroup,
  type RecentGroupItem,
} from '@/lib/recent-groups-repository';

export default function HomeScreen() {
  const { email } = useAuth();
  const c = useTheme();
  const { t } = useLocale();
  const [recents, setRecents] = useState<RecentGroupItem[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [attention, setAttention] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<RecentGroupItem | null>(null);
  const [renameFor, setRenameFor] = useState<RecentGroupItem | null>(null);

  const load = useCallback(async () => {
    setError(null);
    listInvites()
      .then(setInvites)
      .catch(() => setInvites([]));
    try {
      const items = await listRecentGroups();
      setRecents(items);
      if (email) {
        countGroupAttention(
          items.map((r) => r.groupId),
          email,
        )
          .then(setAttention)
          .catch(() => setAttention({}));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('home.loadFailed'));
    }
  }, [email, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Point 4: a fresh invite lands here without a manual refresh.
  useInvitesRealtime(email, load);

  function openGroup(item: { groupId: string; name: string }) {
    router.push({
      pathname: '/(app)/group-login',
      params: { groupId: item.groupId, name: item.name },
    });
  }

  async function respondInvite(item: Invite, accept: boolean) {
    if (busyInvite) return;
    setBusyInvite(item.groupId);
    try {
      await respondToInvite(item.groupId, accept);
      if (accept) await touchRecentGroup(item.groupId);
      load();
    } catch (e) {
      Alert.alert(
        t('common.failed'),
        e instanceof Error ? e.message : t('common.retry'),
      );
    } finally {
      setBusyInvite(null);
    }
  }

  function confirmRemove(item: RecentGroupItem) {
    Alert.alert(t('home.removeTitle', { name: item.name }), t('home.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('home.removeFromList'),
        style: 'destructive',
        onPress: async () => {
          try {
            await hideRecentGroup(item.groupId);
            load();
          } catch (e) {
            Alert.alert(
              t('common.failed'),
              e instanceof Error ? e.message : t('common.retry'),
            );
          }
        },
      },
    ]);
  }

  async function doDuplicate(item: RecentGroupItem, name: string) {
    setRenameFor(null);
    try {
      const { groupId } = await duplicateGroup(item.groupId, name);
      await touchRecentGroup(groupId);
      load();
    } catch (e) {
      Alert.alert(
        t('common.failed'),
        e instanceof Error ? e.message : t('common.retry'),
      );
    }
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
          accessibilityLabel={t('nav.settings')}
          hitSlop={10}
        >
          <Ionicons name="settings-outline" size={22} color={c.textSecondary} />
        </Pressable>
      </View>

      <ThemedText type="subtitle">Kongsi</ThemedText>
      <ThemedText themeColor="textSecondary">{t('home.tagline')}</ThemedText>

      {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

      {invites.length > 0 ? (
        <View style={styles.section}>
          <ThemedText themeColor="textFaint" style={styles.sectionLabel}>
            {t('home.invites')}
          </ThemedText>
          {invites.map((item) => (
            <View
              key={item.groupId}
              style={[styles.inviteRow, { backgroundColor: c.surface }]}
            >
              <ThemedText style={styles.recentName}>{item.name}</ThemedText>
              <View style={styles.inviteActions}>
                <Pressable
                  onPress={() => respondInvite(item, true)}
                  disabled={busyInvite === item.groupId}
                  hitSlop={6}
                >
                  <ThemedText style={[styles.act, { color: c.success }]}>
                    {t('home.accept')}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => respondInvite(item, false)}
                  disabled={busyInvite === item.groupId}
                  hitSlop={6}
                >
                  <ThemedText style={[styles.act, { color: c.danger }]}>
                    {t('home.decline')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {recents && recents.length > 0 ? (
        <View style={styles.section}>
          <ThemedText themeColor="textFaint" style={styles.sectionLabel}>
            {t('home.continue')}
          </ThemedText>
          {recents.map((item) => {
            const badge = attention[item.groupId] ?? 0;
            return (
              <Pressable
                key={item.groupId}
                onPress={() => openGroup(item)}
                onLongPress={() => setMenuFor(item)}
                style={({ pressed }) => [
                  styles.recentRow,
                  { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <ThemedText style={styles.recentName}>{item.name}</ThemedText>
                {badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: c.danger }]}>
                    <ThemedText style={styles.badgeText}>
                      {badge > 9 ? '9+' : badge}
                    </ThemedText>
                  </View>
                ) : null}
                <ThemedText themeColor="textFaint" style={styles.recentCode}>
                  {item.code}
                </ThemedText>
                <Pressable
                  onPress={() => setMenuFor(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.rowMenu', { name: item.name })}
                  style={styles.kebab}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={18}
                    color={c.textFaint}
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText themeColor="textFaint" style={styles.sectionLabel}>
          {t('home.startNew')}
        </ThemedText>
        <Button
          label={t('home.createGroup')}
          onPress={() => router.push('/(app)/create-group')}
        />
        <Button
          label={t('home.joinGroup')}
          variant="secondary"
          onPress={() => router.push('/(app)/join-group')}
        />
      </View>

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.name}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                {
                  key: 'duplicate',
                  label: t('home.duplicate'),
                  icon: (
                    <Ionicons
                      name="copy-outline"
                      size={20}
                      color={c.textSecondary}
                    />
                  ),
                  onPress: () => setRenameFor(menuFor),
                },
                {
                  key: 'remove',
                  label: t('home.removeFromList'),
                  destructive: true,
                  icon: (
                    <Ionicons name="trash-outline" size={20} color={c.danger} />
                  ),
                  onPress: () => confirmRemove(menuFor),
                },
              ]
            : []
        }
      />

      <PromptDialog
        visible={!!renameFor}
        title={t('home.duplicateTitle')}
        message={t('home.duplicateBody')}
        placeholder={t('create.groupNamePlaceholder')}
        initialValue={renameFor ? t('home.copySuffix', { name: renameFor.name }) : ''}
        confirmLabel={t('home.duplicate')}
        onCancel={() => setRenameFor(null)}
        onConfirm={(name) => renameFor && doDuplicate(renameFor, name)}
      />
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
  section: { gap: Spacing.two, marginTop: Spacing.two },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
  },
  recentName: { fontSize: 15, fontWeight: '600', flex: 1 },
  recentCode: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  kebab: { padding: 2, marginRight: -4 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.two,
  },
  inviteActions: { flexDirection: 'row', gap: Spacing.three },
  act: { fontSize: 13, fontWeight: '700' },
});
