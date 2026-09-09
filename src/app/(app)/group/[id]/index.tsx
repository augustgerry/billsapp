import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { isGroupUnlocked } from '@/features/groups/unlocked-groups';
import { useTheme } from '@/hooks/use-theme';
import { billBadge, monthlyOverview, readMonthRecord } from '@/domain/billing';
import { formatRp } from '@/domain/money';
import { monthKey, monthLabel } from '@/domain/dates';
import { fetchGroup } from '@/lib/groups-repository';
import { loadMonth } from '@/lib/payments-repository';
import type { Group } from '@/types/models';

/**
 * Dashboard — SKELETON. Shows the group is wired end-to-end (fetch + domain
 * selectors). The real tabbed dashboard (brief §6) is the next screen.
 */
export default function GroupScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const { email } = useAuth();
  const c = useTheme();
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const g = await fetchGroup(id);
        g.monthly[monthKey()] = await loadMonth(id, monthKey());
        if (active) setGroup(g);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : 'Gagal memuat grup');
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (!isGroupUnlocked(id)) {
    return (
      <Redirect
        href={{ pathname: '/(app)/group-login', params: { groupId: id } }}
      />
    );
  }

  if (error) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ThemedText themeColor="danger">{error}</ThemedText>
      </Screen>
    );
  }

  if (!group) return <LoadingScreen />;

  const me = group.members.find(
    (m) => m.email.toLowerCase() === (email ?? '').toLowerCase(),
  );
  const overview = monthlyOverview(group, monthKey());

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText type="subtitle">{group.name}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {group.members.map((m) => m.name).join(', ')}
      </ThemedText>

      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <ThemedText themeColor="textFaint" style={styles.small}>
          Total {monthLabel()}
        </ThemedText>
        <ThemedText style={styles.total}>{formatRp(overview.totalMonth)}</ThemedText>
        {me ? (
          <ThemedText themeColor="textSecondary" style={styles.small}>
            Bagian kamu: {formatRp(overview.contributions[me.name] ?? 0)}
          </ThemedText>
        ) : null}
      </View>

      <ThemedText themeColor="textFaint" style={styles.small}>
        TAGIHAN BULAN INI ({group.bills.length})
      </ThemedText>
      {group.bills.length === 0 ? (
        <ThemedText themeColor="textFaint">
          Belum ada tagihan. Tambahkan tagihan pertama.
        </ThemedText>
      ) : (
        group.bills.map((bill) => {
          const rec = readMonthRecord(group, monthKey(), bill.id);
          const badge = billBadge(bill, rec);
          return (
            <View
              key={bill.id}
              style={[styles.billRow, { borderColor: c.border }]}
            >
              <ThemedText style={styles.billName}>{bill.name}</ThemedText>
              <ThemedText themeColor="textFaint" style={styles.small}>
                {badge.text}
              </ThemedText>
            </View>
          );
        })
      )}

      <Button
        label="Tambah tagihan baru"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/(app)/group/[id]/add-bill', params: { id } })
        }
      />
      <Button label="Kembali ke Home" variant="ghost" onPress={() => router.replace('/(app)')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: Spacing.three, gap: 4 },
  total: { fontSize: 22, fontWeight: '800' },
  small: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  billRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billName: { fontSize: 15, fontWeight: '600' },
});
