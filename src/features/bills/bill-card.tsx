import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { CategoryIcons, Spacing } from '@/constants/theme';
import {
  billAmountForMonth,
  billBadge,
  billMetaText,
  canConfirmPayment,
  canEditNominal,
  canReupload,
  canSelfDeclare,
  earlyPayoffInfo,
  expectedShare,
  isInstallmentDone,
  paymentStatus,
  requiredMembers,
} from '@/domain/billing';
import { formatDateTime } from '@/domain/dates';
import { formatRp, parseRupiah } from '@/domain/money';
import { useLocale } from '@/features/settings/locale';
import { useCategoryColors, useTheme } from '@/hooks/use-theme';
import type { Bill, MemberName, MonthRecord } from '@/types/models';

export type ProofAction =
  | { type: 'upload'; member: MemberName }
  | { type: 'selfDeclare'; member: MemberName }
  | { type: 'confirm'; member: MemberName }
  | { type: 'reject'; member: MemberName }
  | { type: 'reupload'; member: MemberName }
  | { type: 'earlyPayoff' };

interface BillCardProps {
  bill: Bill;
  record: MonthRecord;
  currentUser: MemberName;
  onEditNominal: (billId: string, amount: number) => Promise<void>;
  onAction: (action: ProofAction) => Promise<void>;
  resolveProofUrl: (path: string) => Promise<string>;
}

function RowAction({
  label,
  color,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={[styles.rowAction, { opacity: loading || disabled ? 0.4 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <ThemedText style={[styles.rowActionText, { color }]}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

export function BillCard({
  bill,
  record,
  currentUser,
  onEditNominal,
  onAction,
  resolveProofUrl,
}: BillCardProps) {
  const c = useTheme();
  const { t, lang } = useLocale();
  const catColor = useCategoryColors();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [proofFor, setProofFor] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const badge = billBadge(bill, record, new Date(), lang);
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
  const isPJ = currentUser === bill.responsible;
  const payoff = earlyPayoffInfo(bill, record);

  async function run(key: string, action: ProofAction) {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await onAction(action);
    } finally {
      setBusyKey(null);
    }
  }

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

  async function toggleProof(member: string, path: string) {
    if (proofFor === member) {
      setProofFor(null);
      return;
    }
    setProofFor(member);
    setProofUrl(null);
    try {
      setProofUrl(await resolveProofUrl(path));
    } catch {
      setProofUrl(null);
    }
  }

  function memberRow(member: MemberName, rowAmount: number) {
    const status = paymentStatus(record, member);
    const mine = currentUser === member;
    const p = record.payments[member];
    const label =
      bill.type === 'split' ? `${member} → ${bill.responsible}` : member;

    let statusText: string = {
      paid: t('card.paid'),
      unpaid: t('card.unpaid'),
      review: t('card.review'),
      awaiting: t('card.awaitingFor', { name: bill.responsible }),
    }[status];
    let statusColor: string =
      status === 'paid'
        ? c.success
        : status === 'unpaid'
          ? c.danger
          : c.gold;
    if (status === 'awaiting' && isPJ) statusText = t('card.awaitingYou');

    const actions: ReactNode[] = [];
    if (status === 'unpaid' && mine) {
      actions.push(
        <RowAction
          key="up"
          label={t('card.uploadProof')}
          color={c.primaryText}
          loading={busyKey === `upload:${member}`}
          disabled={!!busyKey}
          onPress={() => run(`upload:${member}`, { type: 'upload', member })}
        />,
      );
    } else if (status === 'review') {
      if (canReupload(currentUser, member)) {
        actions.push(
          <RowAction
            key="re"
            label={t('card.reupload')}
            color={c.textSecondary}
            loading={busyKey === `reupload:${member}`}
            disabled={!!busyKey}
            onPress={() =>
              run(`reupload:${member}`, { type: 'reupload', member })
            }
          />,
        );
      }
      if (canSelfDeclare(bill, currentUser, member)) {
        actions.push(
          <RowAction
            key="sd"
            label={
              bill.type === 'split' ? t('card.markPaidSplit') : t('card.markValid')
            }
            color={c.primaryText}
            loading={busyKey === `selfDeclare:${member}`}
            disabled={!!busyKey}
            onPress={() =>
              run(`selfDeclare:${member}`, { type: 'selfDeclare', member })
            }
          />,
        );
      }
    } else if (status === 'awaiting' && canConfirmPayment(bill, currentUser)) {
      actions.push(
        <RowAction
          key="ok"
          label={t('card.confirm')}
          color={c.success}
          loading={busyKey === `confirm:${member}`}
          disabled={!!busyKey}
          onPress={() => run(`confirm:${member}`, { type: 'confirm', member })}
        />,
        <RowAction
          key="no"
          label={t('card.reject')}
          color={c.danger}
          loading={busyKey === `reject:${member}`}
          disabled={!!busyKey}
          onPress={() => run(`reject:${member}`, { type: 'reject', member })}
        />,
      );
    }

    const canView = (mine || isPJ) && !!p?.proofImage;

    return (
      <View key={member} style={[styles.memberRow, { borderTopColor: c.border }]}>
        <View style={styles.memberTop}>
          <View style={styles.memberLeft}>
            <ThemedText style={styles.memberName}>{label}</ThemedText>
            <ThemedText themeColor="textFaint" style={styles.memberAmount}>
              {formatRp(rowAmount)}
              {p?.amount != null && p.status !== 'unpaid'
                ? `${t('card.ocrRead', { amount: formatRp(p.amount) })}${p.ocrMatched === false ? t('card.ocrDiff') : ''}`
                : ''}
              {p?.platform ? ` · ${p.platform}` : ''}
            </ThemedText>
          </View>
          <ThemedText style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </ThemedText>
        </View>
        {p?.isReceipt === false && p.status !== 'unpaid' ? (
          <ThemedText style={[styles.warn, { color: c.danger }]}>
            {t('card.notReceipt')}
          </ThemedText>
        ) : p?.suspiciousNote && p.status !== 'unpaid' ? (
          <ThemedText style={[styles.warn, { color: c.gold }]}>
            ⚠️ {p.suspiciousNote}
          </ThemedText>
        ) : null}
        {actions.length > 0 ? <View style={styles.actions}>{actions}</View> : null}
        {canView && p?.proofImage ? (
          <View>
            <RowAction
              label={proofFor === member ? t('card.hideProof') : t('card.viewProof')}
              color={c.primaryText}
              onPress={() => toggleProof(member, p.proofImage!)}
            />
            {p.uploadedAt ? (
              <ThemedText themeColor="textFaint" style={styles.uploadedAt}>
                {t('card.uploadedAt', {
                  when: formatDateTime(p.uploadedAt, lang),
                })}
              </ThemedText>
            ) : null}
            {proofFor === member ? (
              proofUrl ? (
                <Image
                  source={{ uri: proofUrl }}
                  style={styles.proofImg}
                  contentFit="contain"
                />
              ) : (
                <ActivityIndicator style={styles.proofImg} color={c.primary} />
              )
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: c.border }]}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.header}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor:
                (catColor[bill.category] ?? c.primary) + '28',
            },
          ]}
        >
          <ThemedText>{CategoryIcons[bill.category] ?? '📄'}</ThemedText>
        </View>
        <View style={styles.headerBody}>
          <ThemedText style={styles.name}>{bill.name}</ThemedText>
          <ThemedText themeColor="textFaint" style={styles.meta}>
            {billMetaText(bill, lang)}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.badge, { backgroundColor: badgeColor + '22' }]}>
            <ThemedText style={[styles.badgeText, { color: badgeColor }]}>
              {badge.text}
            </ThemedText>
          </View>
          <ThemedText themeColor="textFaint">{open ? '▾' : '▸'}</ThemedText>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {canEditNominal(bill, currentUser) ? (
            editing ? (
              <View style={styles.editBox}>
                <TextField
                  label={t('card.newNominal')}
                  value={draft ? formatRp(draft) : ''}
                  onChangeText={(v) => setDraft(parseRupiah(v))}
                  keyboardType="number-pad"
                  placeholder={formatRp(bill.estimate)}
                />
                <View style={styles.row}>
                  <Button
                    label={t('common.save')}
                    onPress={saveEdit}
                    loading={savingEdit}
                    disabled={draft <= 0}
                    style={styles.flex1}
                  />
                  <Button
                    label={t('common.cancel')}
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
                  {t('card.editNominal')}
                </ThemedText>
              </Pressable>
            )
          ) : null}

          {done ? (
            <ThemedText themeColor="textFaint" style={styles.doneNote}>
              {t('card.installmentDone')}
            </ThemedText>
          ) : bill.type === 'split' ? (
            <>
              <View style={[styles.memberRow, { borderTopColor: c.border }]}>
                <ThemedText themeColor="textFaint" style={styles.memberName}>
                  {t('card.fronts', {
                    name: bill.responsible,
                    amount: formatRp(share),
                  })}
                </ThemedText>
              </View>
              {required.map((m) => memberRow(m, share))}
            </>
          ) : (
            required.map((m) => memberRow(m, amount))
          )}

          {payoff ? (
            <View style={[styles.memberRow, { borderTopColor: c.border }]}>
              <View style={styles.memberTop}>
                <View style={styles.memberLeft}>
                  <ThemedText style={styles.memberName}>
                    {t('card.payoffRow', { n: payoff.remaining })}
                  </ThemedText>
                  <ThemedText themeColor="textFaint" style={styles.memberAmount}>
                    {formatRp(payoff.remainingAmount)}
                  </ThemedText>
                </View>
              </View>
              {isPJ ? (
                <View style={styles.actions}>
                  <RowAction
                    label={t('card.payoffUpload')}
                    color={c.primaryText}
                    loading={busyKey === 'earlyPayoff'}
                    disabled={!!busyKey}
                    onPress={() => run('earlyPayoff', { type: 'earlyPayoff' })}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
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
  body: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: 4,
  },
  editLink: { fontSize: 12, fontWeight: '700', paddingVertical: 4 },
  editBox: { gap: Spacing.two, paddingVertical: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
  doneNote: { fontSize: 13, paddingVertical: Spacing.two },
  memberRow: { paddingVertical: 8, borderTopWidth: 1, gap: 6 },
  memberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  memberLeft: { flex: 1 },
  memberName: { fontSize: 13, fontWeight: '600' },
  memberAmount: { fontSize: 12, marginTop: 1 },
  statusText: { fontSize: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  rowAction: { paddingVertical: 4 },
  rowActionText: { fontSize: 12, fontWeight: '700' },
  warn: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  uploadedAt: { fontSize: 11, marginTop: 2 },
  proofImg: { width: '100%', height: 220, marginTop: 6, borderRadius: 8 },
});
