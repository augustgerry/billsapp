import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { CategoryColors, CategoryIcons, Spacing } from '@/constants/theme';
import {
  billAmountForMonth,
  billBadge,
  billMetaText,
  canEditNominal,
  expectedShare,
  isInstallmentDone,
  paymentStatus,
  requiredMembers,
} from '@/domain/billing';
import { formatRp, parseRupiah } from '@/domain/money';
import { useTheme } from '@/hooks/use-theme';
import type { Bill, MemberName, MemberPayment, MonthRecord } from '@/types/models';

const STATUS_LABEL: Record<MemberPayment['status'], string> = {
  paid: 'Lunas',
  unpaid: 'Belum bayar',
  review: 'Perlu dicek',
  awaiting: 'Menunggu konfirmasi',
};

interface BillCardProps {
  bill: Bill;
  record: MonthRecord;
  currentUser: MemberName;
  onEditNominal: (billId: string, amount: number) => Promise<void>;
}

export function BillCard({
  bill,
  record,
  currentUser,
  onEditNominal,
}: BillCardProps) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  const badge = billBadge(bill, record);
  const badgeColor =
    badge.kind === 'overdue'
      ? c.danger
      : badge.kind === 'due'
        ? c.gold
        : c.success;
  const amount = billAmountForMonth(bill, record);
  const share = expectedShare(bill, record);
  const done = isInstallmentDone(bill);
  const required = requiredMembers(bill);
  const canEdit = canEditNominal(bill, currentUser);
  const isPJ = currentUser === bill.responsible;

  async function saveEdit() {
    if (draft <= 0 || savingEdit) return;
    setSavingEdit(true);
    try {
      await onEditNominal(bill.id, draft);
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  function memberRow(member: MemberName, rowAmount: number) {
    const status = paymentStatus(record, member);
    const label =
      bill.type === 'split'
        ? `${member} → ${bill.responsible}`
        : member;
    let statusText = STATUS_LABEL[status];
    let statusColor: string = c.textFaint;
    if (status === 'paid') statusColor = c.success;
    else if (status === 'review') statusColor = c.gold;
    else if (status === 'awaiting') {
      statusColor = c.gold;
      statusText = isPJ
        ? 'Perlu kamu konfirmasi'
        : `Menunggu konfirmasi ${bill.responsible}`;
    } else if (status === 'unpaid') statusColor = c.danger;

    return (
      <View key={member} style={[styles.memberRow, { borderTopColor: c.border }]}>
        <View style={styles.memberLeft}>
          <ThemedText style={styles.memberName}>{label}</ThemedText>
          <ThemedText themeColor="textFaint" style={styles.memberAmount}>
            {formatRp(rowAmount)}
          </ThemedText>
        </View>
        <ThemedText style={[styles.statusText, { color: statusColor }]}>
          {statusText}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: c.border }]}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.header}>
        <View
          style={[
            styles.icon,
            { backgroundColor: (CategoryColors[bill.category] ?? c.primary) + '28' },
          ]}
        >
          <ThemedText>{CategoryIcons[bill.category] ?? '📄'}</ThemedText>
        </View>
        <View style={styles.headerBody}>
          <ThemedText style={styles.name}>{bill.name}</ThemedText>
          <ThemedText themeColor="textFaint" style={styles.meta}>
            {billMetaText(bill)}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[styles.badge, { backgroundColor: badgeColor + '22' }]}
          >
            <ThemedText style={[styles.badgeText, { color: badgeColor }]}>
              {badge.text}
            </ThemedText>
          </View>
          <ThemedText themeColor="textFaint">{open ? '▾' : '▸'}</ThemedText>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {canEdit ? (
            editing ? (
              <View style={styles.editBox}>
                <TextField
                  label="Nominal baru"
                  value={draft ? formatRp(draft) : ''}
                  onChangeText={(t) => setDraft(parseRupiah(t))}
                  keyboardType="number-pad"
                  placeholder={formatRp(bill.estimate)}
                />
                <View style={styles.row}>
                  <Button
                    label="Simpan"
                    onPress={saveEdit}
                    loading={savingEdit}
                    disabled={draft <= 0}
                    style={styles.flex1}
                  />
                  <Button
                    label="Batal"
                    variant="secondary"
                    onPress={() => setEditing(false)}
                    style={styles.flex1}
                  />
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setDraft(bill.estimate);
                  setEditing(true);
                }}
              >
                <ThemedText themeColor="primaryText" style={styles.editLink}>
                  Edit nominal
                </ThemedText>
              </Pressable>
            )
          ) : null}

          {done ? (
            <ThemedText themeColor="textFaint" style={styles.doneNote}>
              Semua cicilan sudah lunas.
            </ThemedText>
          ) : bill.type === 'split' ? (
            <>
              <View style={[styles.memberRow, { borderTopColor: c.border }]}>
                <ThemedText themeColor="textFaint" style={styles.memberName}>
                  {bill.responsible} menalangi ke penyedia · {formatRp(share)}
                </ThemedText>
              </View>
              {required.map((m) => memberRow(m, share))}
            </>
          ) : (
            required.map((m) => memberRow(m, amount))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  body: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: 4 },
  editLink: { fontSize: 12, fontWeight: '700', paddingVertical: 4 },
  editBox: { gap: Spacing.two, paddingVertical: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
  doneNote: { fontSize: 13, paddingVertical: Spacing.two },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  memberLeft: { flex: 1 },
  memberName: { fontSize: 13, fontWeight: '600' },
  memberAmount: { fontSize: 12, marginTop: 1 },
  statusText: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
});
