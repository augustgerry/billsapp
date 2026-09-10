import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatRp } from '@/domain/money';
import { useT } from '@/features/settings/locale';
import { useTheme } from '@/hooks/use-theme';
import type { MemberSummary } from '@/types/models';

/** "Siapa belum bayar" — never shows "Lunas" for a member with no dues at all. */
export function OwedCard({ members }: { members: MemberSummary[] }) {
  const c = useTheme();
  const t = useT();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <ThemedText style={styles.heading}>{t('owed.title')}</ThemedText>
      {members.map((m) => {
        const owes = m.owed > 0;
        return (
          <View key={m.name}>
            <Pressable
              disabled={!owes}
              onPress={() =>
                setExpanded((prev) => (prev === m.name ? null : m.name))
              }
              style={[styles.row, { borderTopColor: c.border }]}
            >
              <ThemedText>{m.name}</ThemedText>
              {!m.hasDues ? (
                <ThemedText themeColor="textFaint" style={styles.small}>
                  {t('owed.noDues')}
                </ThemedText>
              ) : !owes ? (
                <ThemedText style={[styles.small, { color: c.success }]}>
                  {t('owed.settled')}
                </ThemedText>
              ) : (
                <ThemedText style={[styles.small, { color: c.danger }]}>
                  {t('owed.unpaidAmount', { amount: formatRp(m.owed) })}
                </ThemedText>
              )}
            </Pressable>
            {expanded === m.name
              ? m.owedDetail.map((d, i) => (
                  <ThemedText
                    key={i}
                    themeColor="textFaint"
                    style={styles.detail}
                  >
                    {d.billName} — {formatRp(d.amount)}
                  </ThemedText>
                ))
              : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, paddingHorizontal: Spacing.three },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  small: { fontSize: 13, fontWeight: '700' },
  detail: { fontSize: 12, paddingLeft: Spacing.two, paddingBottom: 4 },
});
