import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildExportRows } from '@/domain/billing';
import type { Locale } from '@/domain/i18n';
import { formatRp } from '@/domain/money';
import type { Group } from '@/types/models';

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"]/g, (ch) =>
    ch === '&'
      ? '&amp;'
      : ch === '<'
        ? '&lt;'
        : ch === '>'
          ? '&gt;'
          : '&quot;',
  );
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 40) || 'grup';
}

/**
 * Build a CSV of every recorded month and open the share sheet (Excel / Sheets
 * open CSV directly). PDF export from the prototype is not ported yet.
 */
export async function exportRekapCsv(
  group: Group,
  locale: Locale = 'id',
): Promise<void> {
  const en = locale === 'en';
  const rows = buildExportRows(group, locale);
  if (rows.length === 0) {
    throw new Error(en ? 'Nothing to export yet.' : 'Belum ada data untuk diekspor.');
  }

  const csv = [
    (en
      ? ['Month', 'Bill', 'Category', 'Amount', 'Type']
      : ['Bulan', 'Tagihan', 'Kategori', 'Nominal', 'Tipe']
    ).join(','),
    ...rows.map((r) =>
      [r.bulan, r.tagihan, r.kategori, r.nominal, r.tipe].map(csvCell).join(','),
    ),
  ].join('\n');

  const uri = `${FileSystem.cacheDirectory}${safeName(group.name)}-rekap.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      en ? 'Sharing is not available on this device.' : 'Berbagi tidak tersedia di perangkat ini.',
    );
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: `${group.name} — ${en ? 'bills' : 'rekap tagihan'}`,
    UTI: 'public.comma-separated-values-text',
  });
}

/** Render the same rows to a one-page PDF and open the share sheet. */
export async function exportRekapPdf(
  group: Group,
  locale: Locale = 'id',
): Promise<void> {
  const en = locale === 'en';
  const rows = buildExportRows(group, locale);
  if (rows.length === 0) {
    throw new Error(en ? 'Nothing to export yet.' : 'Belum ada data untuk diekspor.');
  }

  const total = rows.reduce((sum, r) => sum + r.nominal, 0);
  const body = rows
    .map(
      (r) => `<tr>
        <td>${htmlEscape(r.bulan)}</td>
        <td>${htmlEscape(r.tagihan)}</td>
        <td>${htmlEscape(r.kategori)}</td>
        <td class="r">${htmlEscape(formatRp(r.nominal))}</td>
        <td>${htmlEscape(r.tipe)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8">
    <style>
      body { font-family: -apple-system, Roboto, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p { color: #666; margin: 0 0 16px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #ddd; }
      th { background: #f4f4f7; }
      .r { text-align: right; }
      tfoot td { font-weight: 700; border-top: 2px solid #999; }
    </style></head><body>
    <h1>${en ? 'Bill summary' : 'Rekap Tagihan'} — ${htmlEscape(group.name)}</h1>
    <p>${en ? 'Generated' : 'Dibuat'} ${new Date().toLocaleDateString(en ? 'en-US' : 'id-ID')}</p>
    <table>
      <thead><tr>${(en
        ? ['Month', 'Bill', 'Category', 'Amount', 'Type']
        : ['Bulan', 'Tagihan', 'Kategori', 'Nominal', 'Tipe']
      )
        .map((h, i) => `<th${i === 3 ? ' class="r"' : ''}>${h}</th>`)
        .join('')}</tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td colspan="3">Total</td><td class="r">${htmlEscape(formatRp(total))}</td><td></td></tr></tfoot>
    </table>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      en ? 'Sharing is not available on this device.' : 'Berbagi tidak tersedia di perangkat ini.',
    );
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `${group.name} — ${en ? 'bills' : 'rekap tagihan'}`,
    UTI: 'com.adobe.pdf',
  });
}
