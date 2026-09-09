import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { buildExportRows } from '@/domain/billing';
import type { Group } from '@/types/models';

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 40) || 'grup';
}

/**
 * Build a CSV of every recorded month and open the share sheet (Excel / Sheets
 * open CSV directly). PDF export from the prototype is not ported yet.
 */
export async function exportRekapCsv(group: Group): Promise<void> {
  const rows = buildExportRows(group);
  if (rows.length === 0) {
    throw new Error('Belum ada data buat diekspor.');
  }

  const csv = [
    ['Bulan', 'Tagihan', 'Kategori', 'Nominal', 'Tipe'].join(','),
    ...rows.map((r) =>
      [r.bulan, r.tagihan, r.kategori, r.nominal, r.tipe].map(csvCell).join(','),
    ),
  ].join('\n');

  const uri = `${FileSystem.cacheDirectory}${safeName(group.name)}-rekap.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Fitur bagikan file nggak tersedia di perangkat ini.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: `Rekap tagihan ${group.name}`,
    UTI: 'public.comma-separated-values-text',
  });
}
