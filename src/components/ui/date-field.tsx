import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/settings/locale';
import { useTheme } from '@/hooks/use-theme';
import { MONTH_NAMES_FULL, MONTH_NAMES_FULL_EN } from '@/domain/dates';

export interface DateParts {
  day: number;
  month: number; // 1-12
  year: number;
}

/**
 * Point 7: one field for a due date. Tapping it opens a single compact popup
 * where day + month + year are all set in one view; the popup also takes a
 * typed `DD/MM/YYYY` and echoes the parsed date live.
 */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Partial<DateParts>;
  onChange: (next: DateParts) => void;
}) {
  const c = useTheme();
  const { t, lang } = useLocale();
  const months = lang === 'en' ? MONTH_NAMES_FULL_EN : MONTH_NAMES_FULL;

  const now = useMemo(() => new Date(), []);
  const complete =
    value.day != null && value.month != null && value.year != null;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateParts>({
    day: value.day ?? 1,
    month: value.month ?? now.getMonth() + 1,
    year: value.year ?? now.getFullYear(),
  });
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) {
      setDraft({
        day: value.day ?? 1,
        month: value.month ?? now.getMonth() + 1,
        year: value.year ?? now.getFullYear(),
      });
      setTyped('');
    }
  }, [open, value.day, value.month, value.year, now]);

  function stepMonth(delta: number) {
    setDraft((d) => {
      let m = d.month + delta;
      let y = d.year;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      return { ...d, month: m, year: y };
    });
  }

  function onType(next: string) {
    // keep digits, re-insert slashes as DD/MM/YYYY
    const digits = next.replace(/[^0-9]/g, '').slice(0, 8);
    let out = digits;
    if (digits.length > 4)
      out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setTyped(out);

    const m = out.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const day = Math.min(31, Math.max(1, parseInt(m[1], 10)));
      const month = Math.min(12, Math.max(1, parseInt(m[2], 10)));
      let year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
      setDraft({ day, month, year });
    }
  }

  const display = complete
    ? `${value.day} ${months[(value.month as number) - 1]} ${value.year}`
    : t('date.pick');

  return (
    <View style={styles.field}>
      <ThemedText themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.button,
          { backgroundColor: c.surface2, borderColor: c.border },
        ]}
      >
        <ThemedText style={{ color: complete ? c.text : c.textFaint }}>
          {display}
        </ThemedText>
        <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText style={styles.cardTitle}>{label}</ThemedText>

            <TextInput
              value={typed}
              onChangeText={onType}
              keyboardType="number-pad"
              placeholder={t('date.typeHint')}
              placeholderTextColor={c.textFaint}
              style={[
                styles.typeInput,
                { backgroundColor: c.surface2, borderColor: c.border, color: c.text },
              ]}
            />
            <ThemedText themeColor="textFaint" style={styles.echo}>
              {`${draft.day} ${months[draft.month - 1]} ${draft.year}`}
            </ThemedText>

            <View style={styles.monthBar}>
              <Pressable onPress={() => stepMonth(-1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color={c.text} />
              </Pressable>
              <ThemedText style={styles.monthLabel}>
                {`${months[draft.month - 1]} ${draft.year}`}
              </ThemedText>
              <Pressable onPress={() => stepMonth(1)} hitSlop={10}>
                <Ionicons name="chevron-forward" size={22} color={c.text} />
              </Pressable>
            </View>

            <View style={styles.grid}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const active = d === draft.day;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDraft((prev) => ({ ...prev, day: d }))}
                    style={[
                      styles.day,
                      {
                        backgroundColor: active ? c.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? c.primaryOn : c.text,
                        fontWeight: active ? '800' : '500',
                        fontSize: 13,
                      }}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label={t('common.done')}
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  button: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  typeInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 16,
    letterSpacing: 1,
  },
  echo: { fontSize: 12, marginTop: -4 },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  monthLabel: { fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  day: {
    width: 38,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
