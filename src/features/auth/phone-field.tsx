import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/settings/locale';
import { useTheme } from '@/hooks/use-theme';
import {
  COUNTRIES,
  flagEmoji,
  type Country,
} from './country-codes';

interface PhoneFieldProps {
  label?: string;
  country: Country;
  onChangeCountry: (country: Country) => void;
  number: string;
  onChangeNumber: (n: string) => void;
  error?: string;
}

export function PhoneField({
  label,
  country,
  onChangeCountry,
  number,
  onChangeNumber,
  error,
}: PhoneFieldProps) {
  const c = useTheme();
  const t = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.dial.includes(q) ||
        item.iso.toLowerCase() === q,
    );
  }, [query]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.textSecondary }]}>
        {label ?? t('register.phoneLabel')}
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[
            styles.country,
            { backgroundColor: c.surface2, borderColor: c.border },
          ]}
        >
          <Text style={styles.flag}>{flagEmoji(country.iso)}</Text>
          <ThemedText style={styles.dial}>{country.dial}</ThemedText>
          <ThemedText themeColor="textFaint">▾</ThemedText>
        </Pressable>
        <TextField
          containerStyle={styles.numberField}
          value={number}
          onChangeText={(t) => onChangeNumber(t.replace(/[^0-9]/g, ''))}
          keyboardType="phone-pad"
          placeholder="81234567890"
          error={error}
        />
      </View>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: c.background }]}>
          <View style={styles.modalHead}>
            <ThemedText type="subtitle">{t('phone.pickCountry')}</ThemedText>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
              <ThemedText themeColor="primaryText" style={styles.close}>
                {t('common.close')}
              </ThemedText>
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('phone.searchCountry')}
            placeholderTextColor={c.textFaint}
            autoFocus
            style={[
              styles.search,
              { backgroundColor: c.surface2, borderColor: c.border, color: c.text },
            ]}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.iso}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChangeCountry(item);
                  setPickerOpen(false);
                  setQuery('');
                }}
                style={[styles.countryRow, { borderBottomColor: c.border }]}
              >
                <Text style={styles.flag}>{flagEmoji(item.iso)}</Text>
                <ThemedText style={styles.countryName}>{item.name}</ThemedText>
                <ThemedText themeColor="textFaint">{item.dial}</ThemedText>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 46,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  flag: { fontSize: 18 },
  dial: { fontSize: 15, fontWeight: '600' },
  numberField: { flex: 1 },
  modal: { flex: 1, paddingHorizontal: Spacing.three },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  close: { fontSize: 15, fontWeight: '700' },
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryName: { flex: 1, fontSize: 15 },
});
