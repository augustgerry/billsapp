import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';

/**
 * Tambah tagihan — PLACEHOLDER (brief §5). The full form (kategori with
 * icons/colours, manual-typed due date, tenor field when kategori = Cicilan,
 * "total ÷ tenor" toggle, single/split) is the next screen.
 */
export default function AddBillScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <ThemedText type="subtitle">Tambah tagihan</ThemedText>
      <ThemedText themeColor="textSecondary">
        Form tambah tagihan belum dibuat. Domain-nya (kategori, tenor Cicilan,
        tipe single/split, hitung total ÷ tenor) sudah siap di{' '}
        <ThemedText type="code">src/domain/billing.ts</ThemedText>.
      </ThemedText>
      <Button
        label="Kembali"
        variant="secondary"
        onPress={() =>
          router.replace({ pathname: '/(app)/group/[id]', params: { id } })
        }
      />
    </Screen>
  );
}
