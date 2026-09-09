import * as Clipboard from 'expo-clipboard';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { BillCard, type ProofAction } from '@/features/bills/bill-card';
import { pickProofImage } from '@/features/bills/pick-proof-image';
import {
  confirmPayment,
  rejectPayment,
  reuploadProof,
  selfDeclare,
  submitEarlyPayoff,
  submitProof,
} from '@/features/bills/proof-actions';
import { useAuth } from '@/features/auth/auth-context';
import { isGroupUnlocked } from '@/features/groups/unlocked-groups';
import { OwedCard } from '@/features/summary/owed-card';
import { TrendChart } from '@/features/summary/trend-chart';
import { exportRekapCsv } from '@/features/summary/export-rekap';
import { useTheme } from '@/hooks/use-theme';
import {
  buildReminderText,
  computeMonthlyCategoryTotals,
  monthlyOverview,
  readMonthRecord,
} from '@/domain/billing';
import { monthKey, monthLabel } from '@/domain/dates';
import { formatRp } from '@/domain/money';
import { updateBillEstimate } from '@/lib/bills-repository';
import { fetchGroup } from '@/lib/groups-repository';
import { loadAllMonths } from '@/lib/payments-repository';
import { signedProofUrl } from '@/lib/proofs';
import type { Bill, Group } from '@/types/models';

type Tab = 'tagihan' | 'ringkasan';

export default function GroupScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const { email } = useAuth();
  const c = useTheme();

  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('tagihan');
  const month = monthKey();

  const load = useCallback(async () => {
    setError(null);
    try {
      const g = await fetchGroup(id);
      g.monthly = await loadAllMonths(id);
      setGroup(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat grup');
    }
  }, [id, month]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isGroupUnlocked(id)) {
    return (
      <Redirect
        href={{ pathname: '/(app)/group-login', params: { groupId: id } }}
      />
    );
  }

  if (error && !group) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ThemedText themeColor="danger">{error}</ThemedText>
        <Button label="Coba lagi" variant="secondary" onPress={() => void load()} />
      </Screen>
    );
  }
  if (!group) return <LoadingScreen />;

  const me = group.members.find(
    (m) => m.email.toLowerCase() === (email ?? '').toLowerCase(),
  );
  const currentUser = me?.name ?? '';
  const overview = monthlyOverview(group, month);

  async function handleEditNominal(billId: string, amount: number) {
    await updateBillEstimate(billId, amount);
    await load();
  }

  async function handleAction(bill: Bill, action: ProofAction) {
    const g = group!;
    const record = readMonthRecord(g, month, bill.id);
    try {
      switch (action.type) {
        case 'upload': {
          const img = await pickProofImage();
          if (!img) return;
          const { matched } = await submitProof({
            group: g,
            bill,
            record,
            month,
            member: action.member,
            base64: img.base64,
          });
          if (!matched) {
            Alert.alert(
              'Perlu dicek',
              'Nominal di bukti nggak kebaca / beda dari yang diharapkan. Cek lalu tandai kalau memang sudah bayar.',
            );
          }
          break;
        }
        case 'earlyPayoff': {
          const img = await pickProofImage();
          if (!img) return;
          const { matched } = await submitEarlyPayoff({
            group: g,
            bill,
            record,
            month,
            base64: img.base64,
          });
          if (!matched) {
            Alert.alert(
              'Nominal beda',
              'Nominal di bukti nggak cocok sama sisa cicilan. Coba lagi.',
            );
          }
          break;
        }
        case 'selfDeclare':
          await selfDeclare(bill, record, month, action.member);
          break;
        case 'confirm':
          await confirmPayment(bill, record, month, action.member);
          break;
        case 'reject':
          await rejectPayment(bill, record, month, action.member);
          break;
        case 'reupload':
          await reuploadProof(g, bill, record, month, action.member);
          break;
      }
      await load();
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Coba lagi');
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <View style={styles.head}>
        <ThemedText type="subtitle">{group.name}</ThemedText>
        <ThemedText themeColor="textFaint" style={styles.code}>
          {group.code}
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary" style={styles.members}>
        {group.members.map((m) => m.name).join(', ')}
      </ThemedText>

      <Segmented
        options={[
          { label: 'Tagihan', value: 'tagihan' },
          { label: 'Ringkasan', value: 'ringkasan' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'tagihan' ? (
        <>
          <View style={[styles.hero, { backgroundColor: c.surface }]}>
            <View style={styles.heroRow}>
              <View>
                <ThemedText themeColor="textFaint" style={styles.heroLabel}>
                  Pengeluaran saya
                </ThemedText>
                <ThemedText style={styles.heroValue}>
                  {formatRp(overview.contributions[currentUser] ?? 0)}
                </ThemedText>
              </View>
              <View>
                <ThemedText themeColor="textFaint" style={styles.heroLabel}>
                  Total {monthLabel()}
                </ThemedText>
                <ThemedText style={styles.heroValue}>
                  {formatRp(overview.totalMonth)}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.contribList, { borderTopColor: c.border }]}>
              {overview.members.map((m) => (
                <View key={m.name} style={styles.contribRow}>
                  <ThemedText themeColor="textSecondary">{m.name}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {formatRp(m.contribution)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          {group.bills.length === 0 ? (
            <ThemedText themeColor="textFaint" style={styles.empty}>
              Belum ada tagihan. Tambahkan tagihan pertama.
            </ThemedText>
          ) : (
            group.bills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                record={readMonthRecord(group, month, bill.id)}
                currentUser={currentUser}
                onEditNominal={handleEditNominal}
                onAction={(action) => handleAction(bill, action)}
                resolveProofUrl={signedProofUrl}
              />
            ))
          )}

          <Button
            label="+ Tambah tagihan baru"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/(app)/group/[id]/add-bill',
                params: { id },
              })
            }
          />
        </>
      ) : (
        <>
          <OwedCard members={overview.members} />

          <View style={[styles.hero, { backgroundColor: c.surface }]}>
            <ThemedText style={styles.blockTitle}>
              Tren pengeluaran bulanan
            </ThemedText>
            <TrendChart data={computeMonthlyCategoryTotals(group)} />
            <Button
              label="Export ke Excel (CSV)"
              variant="secondary"
              onPress={async () => {
                try {
                  await exportRekapCsv(group);
                } catch (e) {
                  Alert.alert(
                    'Gagal export',
                    e instanceof Error ? e.message : 'Coba lagi',
                  );
                }
              }}
            />
          </View>

          <View style={[styles.hero, { backgroundColor: c.surface }]}>
            <ThemedText style={styles.blockTitle}>Pengingat</ThemedText>
            <View style={[styles.reminderBox, { backgroundColor: c.surface2 }]}>
              <ThemedText themeColor="textSecondary" style={styles.reminderText}>
                {buildReminderText(group, month)}
              </ThemedText>
            </View>
            <Button
              label="Salin teks pengingat"
              variant="secondary"
              onPress={async () => {
                await Clipboard.setStringAsync(buildReminderText(group, month));
                Alert.alert('Tersalin', 'Teks pengingat sudah disalin.');
              }}
            />
          </View>
        </>
      )}

      <Button
        label="Kembali ke Home"
        variant="ghost"
        onPress={() => router.replace('/(app)')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  members: { marginTop: -Spacing.two },
  hero: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  blockTitle: { fontSize: 16, fontWeight: '700' },
  reminderBox: { borderRadius: 10, padding: Spacing.three },
  reminderText: { fontSize: 13, lineHeight: 19 },
  heroRow: { flexDirection: 'row', gap: Spacing.four },
  heroLabel: { fontSize: 12 },
  heroValue: { fontSize: 18, fontWeight: '800' },
  contribList: { borderTopWidth: 1, paddingTop: Spacing.two, gap: 4 },
  contribRow: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: Spacing.four },
});
