import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { CategoryIcons, Spacing } from '@/constants/theme';
import { MONTH_NAMES_FULL } from '@/domain/dates';
import { perInstallmentFromTotal } from '@/domain/billing';
import { toTitleCase } from '@/domain/text';
import { formatRp, parseRupiah } from '@/domain/money';
import { useCategoryColors, useTheme } from '@/hooks/use-theme';
import { insertBill } from '@/lib/bills-repository';
import { fetchGroup } from '@/lib/groups-repository';
import { BILL_CATEGORIES, type Bill, type BillCategory, type Group } from '@/types/models';

function Chip({
  label,
  active,
  color,
  icon,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  icon?: string;
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
      {icon ? <ThemedText>{icon} </ThemedText> : null}
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
  const [dueDay, setDueDay] = useState('');
  const [dueMonth, setDueMonth] = useState(String(now.getMonth() + 1));
  const [dueYear, setDueYear] = useState(String(now.getFullYear()));
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
          setLoadError(e instanceof Error ? e.message : 'Gagal memuat grup'),
      );
    return () => {
      active = false;
    };
  }, [id]);

  if (loadError) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <ThemedText themeColor="danger">{loadError}</ThemedText>
      </Screen>
    );
  }
  if (!group) return <LoadingScreen />;

  const members = group.members.map((m) => m.name);
  const isCicilan = category === 'Cicilan';
  const dayN = parseInt(dueDay, 10);
  const tenorN = parseInt(tenor, 10);
  const monthN = parseInt(dueMonth, 10);

  const typeOk =
    billType === 'single'
      ? !!responsible
      : splitMembers.length >= 2 && !!payer && splitMembers.includes(payer);
  const valid =
    name.trim().length > 0 &&
    !!category &&
    amount > 0 &&
    dayN >= 1 &&
    dayN <= 31 &&
    typeOk &&
    (!isCicilan || tenorN > 0);

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
      dueDay: dayN,
      dueMonth: monthN >= 1 && monthN <= 12 ? monthN : now.getMonth() + 1,
      dueYear: parseInt(dueYear, 10) || now.getFullYear(),
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
      setError(e instanceof Error ? e.message : 'Gagal menyimpan tagihan');
      setBusy(false);
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText themeColor="textSecondary">
        Tagihan ini muncul otomatis tiap bulan.
      </ThemedText>

      <TextField
        label="Nama tagihan"
        value={name}
        onChangeText={(t) => setName(toTitleCase(t))}
        placeholder="Contoh: Listrik, Internet, Cicilan Motor"
      />

      <ThemedText themeColor="textSecondary" style={styles.label}>
        Kategori
      </ThemedText>
      <View style={styles.chipRow}>
        {BILL_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            icon={CategoryIcons[cat]}
            color={catColor[cat]}
            active={category === cat}
            onPress={() => setCategory(cat)}
          />
        ))}
      </View>

      {isCicilan ? (
        <>
          <ThemedText themeColor="textSecondary" style={styles.label}>
            Cicilan ini untuk
          </ThemedText>
          <View style={styles.chipRow}>
            <Chip
              label="Diri sendiri"
              active={lender === ''}
              onPress={() => setLender('')}
            />
            {members.map((m) => (
              <Chip
                key={m}
                label={`Pinjaman dari ${m}`}
                active={lender === m}
                onPress={() => setLender(m)}
              />
            ))}
          </View>
          <View style={styles.row}>
            <TextField
              containerStyle={styles.flex1}
              label="Tenor (berapa kali)"
              value={tenor}
              onChangeText={(t) => setTenor(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="12"
            />
            <TextField
              containerStyle={styles.flex1}
              label="Sudah dibayar"
              value={paidCount}
              onChangeText={(t) => setPaidCount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              hint="0 kalau baru mulai"
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
              Hitung dari total keseluruhan ÷ tenor
            </ThemedText>
          </Pressable>
        </>
      ) : null}

      <ThemedText themeColor="textSecondary" style={styles.label}>
        Jatuh tempo
      </ThemedText>
      <View style={styles.row}>
        <TextField
          containerStyle={styles.flex1}
          label="Tgl"
          value={dueDay}
          onChangeText={(t) => setDueDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          placeholder="1-31"
        />
        <TextField
          containerStyle={styles.flex1}
          label="Bulan"
          value={dueMonth}
          onChangeText={(t) => setDueMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          hint={
            monthN >= 1 && monthN <= 12 ? MONTH_NAMES_FULL[monthN - 1] : '1-12'
          }
        />
        <TextField
          containerStyle={styles.flex1}
          label="Thn"
          value={dueYear}
          onChangeText={(t) => setDueYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType="number-pad"
        />
      </View>

      <ThemedText themeColor="textSecondary" style={styles.label}>
        Tipe tanggung jawab
      </ThemedText>
      <Segmented
        options={[
          { label: 'Satu orang', value: 'single' },
          { label: 'Dibagi rata', value: 'split' },
        ]}
        value={billType}
        onChange={(v) => setBillType(v)}
      />

      {billType === 'single' ? (
        <>
          <ThemedText themeColor="textSecondary" style={styles.label}>
            Penanggung jawab
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
            Siapa saja yang ikut menanggung (min. 2)
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
                Transfer ke siapa (yang menalangi duluan)
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
              ? 'Total tagihan keseluruhan'
              : 'Nominal per cicilan'
            : 'Perkiraan nominal'
        }
        value={amount ? formatRp(amount) : ''}
        onChangeText={(t) => setAmount(parseRupiah(t))}
        keyboardType="number-pad"
        placeholder="Rp.300.000"
        hint={
          perMonthPreview != null
            ? `≈ ${formatRp(perMonthPreview)} per bulan × ${tenorN}`
            : undefined
        }
      />

      {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
      <Button
        label="Simpan tagihan"
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
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
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
