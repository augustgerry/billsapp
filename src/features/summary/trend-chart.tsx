import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BILL_CATEGORIES } from '@/types/models';
import { Spacing } from '@/constants/theme';
import type { MonthlyCategoryTotals } from '@/domain/billing';
import { formatShort } from '@/domain/money';
import { useCategoryColors, useTheme } from '@/hooks/use-theme';

const BAR_HEIGHT = 120;

/** Stacked monthly bars per category. Plain Views — no chart lib. */
export function TrendChart({ data }: { data: MonthlyCategoryTotals[] }) {
  const c = useTheme();
  const catColor = useCategoryColors();

  if (data.length < 2) {
    return (
      <ThemedText themeColor="textFaint" style={styles.empty}>
        Grafik muncul setelah ada data dari 2 bulan atau lebih.
      </ThemedText>
    );
  }

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.chart}>
        {data.map((d) => (
          <View key={d.key} style={styles.col}>
            <ThemedText themeColor="textFaint" style={styles.value}>
              {formatShort(d.total)}
            </ThemedText>
            <View style={styles.bar}>
              {BILL_CATEGORIES.map((cat) => {
                const v = d.byCategory[cat] ?? 0;
                if (v <= 0) return null;
                return (
                  <View
                    key={cat}
                    style={{
                      height: (v / max) * BAR_HEIGHT,
                      backgroundColor: catColor[cat],
                    }}
                  />
                );
              })}
            </View>
            <ThemedText themeColor="textFaint" style={styles.label}>
              {d.label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        {BILL_CATEGORIES.map((cat) => (
          <View key={cat} style={styles.legendItem}>
            <View
              style={[styles.swatch, { backgroundColor: catColor[cat] }]}
            />
            <ThemedText themeColor="textSecondary" style={styles.legendText}>
              {cat}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  empty: { fontSize: 13, paddingVertical: Spacing.three },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    minHeight: BAR_HEIGHT + 40,
  },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  value: { fontSize: 10, fontWeight: '700' },
  bar: {
    width: '68%',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'column-reverse',
  },
  label: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontSize: 11 },
});
