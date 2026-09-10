import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DateField, type DateParts } from '@/components/ui/date-field';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { perInstallmentFromTotal } from '@/domain/billing';
import { categoryLabel } from '@/domain/category';
import { toTitleCase } from '@/domain/text';
import { formatRp, parseRupiah } from '@/domain/money';
import { useLocale } from '@/features/settings/locale';
import { useCategoryColors, useTheme } from '@/hooks/use-theme';
import { insertBill } from '@/lib/bills-repository';
import { fetchGroup } from '@/lib/groups-repository';
import { BILL_CATEGORIES, type Bill, type BillCategory, type Group } from '@/types/models';

function Chip({
  label,
  active,
  color,
  dot,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  /** show a small colour swatch before the label (category chips, point 8) */
  dot?: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? (color ?? c.primary) + '28' : c.surface2,
          borderColor: active ? (color ?? c.primary) : c.border,
        },
      ]}
    >
      {dot ? (
        <View
          style={[styles.chipDot, { backgroundColor: color ?? c.primary }]}
        />
      ) : null}
      <ThemedText
        style={{
          fontWeight: active ? '700' : '500',
          color: active ? (color ?? c.primaryText) : c.text,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function AddBillScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const c = useTheme();
  const { t, lang } = useLocale();
  const catColor = useCategoryColors();
  const now = useMemo(() => new Date(), []);

  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<BillCategory | null>(null);
  const [billType, setBillType] = useState<'single' | 'split'>('single');
  const [responsible, setResponsible] = useState<string | null>(null);
  const [splitMembers, setSplitMembers] = useState<string[]>([]);
  const [payer, setPayer] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [due, setDue] = useState<Partial<DateParts>>({});
  const [tenor, setTenor] = useState('');
  const [paidCount, setPaidCount] = useState('0');
  const [lender, setLender] = useState('');
  const [totalMode, setTotalMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchGroup(id)
      .then((g) => active && setGroup(g))
      .catch(
        (e: unknown) =>
          active &&
          setLoadError(String(e)),
      );
    return () => {
      active = false;
    };
  }, [id]);

  if (loadError) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ThemedText themeColor="danger">{t('groupLogin.loadFailed')}</ThemedText>
      </Screen>
    );
  }
  if (!group) return <LoadingScreen />;

  // Point 5: pending members (invited, not yet accepted) are still selectable
  // as PJ / split members so a bill can be created without waiting on everyone.
  // They're shown exactly like active members here — no "invited" tag.
  const members = group.members.map((m) => m.name);

  const isCicilan = category === 'Cicilan';
  const tenorN = parseInt(tenor, 10);
  const dueComplete =
    due.day != null && due.month != null && due.year != null;

  const typeOk =
    billType === 'single'
      ? !!responsible
      : splitMembers.length >= 2 && !!payer && splitMembers.includes(payer);
  const valid =
    name.trim().length > 0 &&
    !!category &&
    amount > 0 &&
    typeOk &&
    // Point 6: only installments have a due date; regular bills skip it entirely
    (!isCicilan || (dueComplete && tenorN > 0));

  const perMonthPreview =
    isCicilan && totalMode && tenorN > 0 && amount > 0
      ? perInstallmentFromTotal(amount, tenorN)
      : null;

  function toggleSplitMember(mName: string) {
    setSplitMembers((prev) => {
      const next = prev.includes(mName)
        ? prev.filter((x) => x !== mName)
        : [...prev, mName];
      if (payer && !next.includes(payer)) setPayer(null);
      return next;
    });
  }

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);

    let estimate = amount;
    let installmentTotal: number | undefined;
    if (isCicilan && totalMode && tenorN > 0) {
      installmentTotal = amount;
      estimate = perInstallmentFromTotal(amount, tenorN);
    }

    const responsibleName = billType === 'single' ? responsible! : payer!;
    const bill: Omit<Bill, 'id'> = {
      name: name.trim(),
      category: category!,
      type: billType,
      responsible: responsibleName,
      splitMembers: billType === 'split' ? splitMembers : [],
      estimate,
      // regular bills carry a harmless default; the form doesn't ask (point 6)
      dueDay: isCicilan ? due.day! : 1,
      dueMonth: isCicilan ? due.month! : now.getMonth() + 1,
      dueYear: isCicilan ? due.year! : now.getFullYear(),
      ...(isCicilan
        ? {
            tenor: tenorN,
            paidCount: parseInt(paidCount, 10) || 0,
            ...(installmentTotal ? { installmentTotal } : {}),
            ...(lender ? { lender } : {}),
          }
        : {}),
    };

    try {
      await insertBill(id, bill);
      router.replace({ pathname: '/(app)/group/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('bill.saveFailed'));
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText themeColor="textSecondary">{t('bill.recurringNote')}</ThemedText>

      <TextField
        label={t('bill.nameLabel')}
        value={name}
        onChangeText={(v) => setName(toTitleCase(v))}
        placeholder={t('bill.namePlaceholder')}
      />

      <ThemedText themeColor="textSecondary" style={styles.label}>
        {t('bill.categoryLabel')}
      </ThemedText>
      <View style={styles.chipRow}>
        {BILL_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={categoryLabel(cat, lang)}
            dot
            color={catColor[cat]}
            active={category === cat}
            onPress={() => setCategory(cat)}
          />
        ))}
      </View>

      {isCicilan ? (
        <>
          <ThemedText themeColor="textSecondary" style={styles.label}>
            {t('bill.installmentFor')}
          </ThemedText>
          <View style={styles.chipRow}>
            <Chip
              label={t('bill.forSelf')}
              active={lender === ''}
              onPress={() => setLender('')}
            />
            {members.map((m) => (
              <Chip
                key={m}
                label={t('bill.loanFrom', { name: m })}
                active={lender === m}
                onPress={() => setLender(m)}
              />
            ))}
          </View>
          <View style={styles.row}>
            <TextField
              containerStyle={styles.flex1}
              label={t('bill.tenorLabel')}
              value={tenor}
              onChangeText={(v) => setTenor(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="12"
            />
            <TextField
              containerStyle={styles.flex1}
              label={t('bill.paidCountLabel')}
              value={paidCount}
              onChangeText={(v) => setPaidCount(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              hint={t('bill.paidCountHint')}
            />
          </View>
          <Pressable
            onPress={() => setTotalMode((v) => !v)}
            style={styles.toggleRow}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: totalMode ? c.primary : c.border,
                  backgroundColor: totalMode ? c.primary : 'transparent',
                },
              ]}
            >
              {totalMode ? (
                <ThemedText style={{ color: c.primaryOn, fontSize: 12 }}>
                  ✓
                </ThemedText>
              ) : null}
            </View>
            <ThemedText themeColor="textSecondary">
              {t('bill.totalModeToggle')}
            </ThemedText>
          </Pressable>
        </>
      ) : null}

      {isCicilan ? (
        <DateField
          label={t('bill.dueLabel')}
          value={due}
          onChange={setDue}
        />
      ) : null}

      <ThemedText themeColor="textSecondary" style={styles.label}>
        {t('bill.typeLabel')}
      </ThemedText>
      <Segmented
        options={[
          { label: t('bill.typeSingle'), value: 'single' },
          { label: t('bill.typeSplit'), value: 'split' },
        ]}
        value={billType}
        onChange={(v) => setBillType(v)}
      />

      {billType === 'single' ? (
        <>
          <ThemedText themeColor="textSecondary" style={styles.label}>
            {t('bill.responsibleLabel')}
          </ThemedText>
          <View style={styles.chipRow}>
            {members.map((m) => (
              <Chip
                key={m}
                label={m}
                active={responsible === m}
                onPress={() => setResponsible(m)}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <ThemedText themeColor="textSecondary" style={styles.label}>
            {t('bill.splitLabel')}
          </ThemedText>
          <View style={styles.chipRow}>
            {members.map((m) => (
              <Chip
                key={m}
                label={m}
                active={splitMembers.includes(m)}
                onPress={() => toggleSplitMember(m)}
              />
            ))}
          </View>
          {splitMembers.length >= 2 ? (
            <>
              <ThemedText themeColor="textSecondary" style={styles.label}>
                {t('bill.payerLabel')}
              </ThemedText>
              <View style={styles.chipRow}>
                {splitMembers.map((m) => (
                  <Chip
                    key={m}
                    label={m}
                    active={payer === m}
                    onPress={() => setPayer(m)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}

      <TextField
        label={
          isCicilan
            ? totalMode
              ? t('bill.amountTotal')
              : t('bill.amountPerInstallment')
            : t('bill.amountEstimate')
        }
        value={amount ? formatRp(amount) : ''}
        onChangeText={(v) => setAmount(parseRupiah(v))}
        keyboardType="number-pad"
        placeholder="Rp.300.000"
        hint={
          perMonthPreview != null
            ? t('bill.perMonthPreview', {
                amount: formatRp(perMonthPreview),
                n: tenorN,
              })
            : undefined
        }
      />

      {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
      <Button
        label={t('bill.submit')}
        onPress={submit}
        disabled={!valid}
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginTop: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
