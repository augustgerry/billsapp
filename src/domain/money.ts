/**
 * Rupiah parsing / formatting. Ported from `kongsi-pilot.html`.
 *
 * The prototype relied on `Number.prototype.toLocaleString('id-ID')`, which is
 * not reliable under Hermes. Grouping is done by hand here so the output is
 * identical on device and in tests: `Rp.` + digits grouped by `.` every 3.
 */

/** Absolute tolerance (in rupiah) for treating an OCR reading as a match. */
export const MATCH_TOLERANCE = 1000;

/** "Rp.300.000" | "300000" | "" -> 300000. Non-digits are stripped. */
export function parseRupiah(value: string | null | undefined): number {
  const digits = (value ?? '').replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/** 300000 -> "Rp.300.000". Rounds. Mirrors the prototype's `formatRp`. */
export function formatRp(n: number | null | undefined): string {
  const rounded = Math.round(n ?? 0);
  const sign = rounded < 0 ? '-' : '';
  const grouped = String(Math.abs(rounded)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    '.',
  );
  return `Rp.${sign}${grouped}`;
}

/** Compact form for charts: 1_500_000 -> "1.5jt", 12_000 -> "12rb". */
export function formatShort(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(Math.round(n));
}

/** Whether an OCR reading is close enough to the expected nominal. */
export function amountMatches(
  read: number | null | undefined,
  expected: number,
): boolean {
  return read != null && Math.abs(read - expected) < MATCH_TOLERANCE;
}
