/**
 * Date helpers. Ported from `kongsi-pilot.html`.
 *
 * Every function takes an optional `now` so tests are deterministic; callers in
 * the app pass nothing and get "real now".
 */

import type { MonthKey } from '../types/models';

export const MONTH_NAMES_FULL = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

/** Current month bucket key, `YYYY-MM`. */
export function monthKey(now: Date = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** "September 2026" */
export function monthLabel(now: Date = new Date()): string {
  return `${MONTH_NAMES_FULL[now.getMonth()]} ${now.getFullYear()}`;
}

/** "2026-09" -> "Sep 26" (for compact chart / export labels). */
export function monthKeyLabel(key: MonthKey): string {
  const [year, month] = key.split('-');
  return `${MONTH_NAMES_SHORT[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

export interface DueStatus {
  /** "H-3" | "Jatuh tempo hari ini" | "Telat 2 hari" */
  text: string;
  overdue: boolean;
}

/**
 * Countdown text for a bill's due day *this* calendar month. Matches the
 * prototype's `daysStatus`: same-day rounds to "jatuh tempo hari ini", any past
 * day is "telat", future is "H-n".
 */
export function daysStatus(dueDay: number, now: Date = new Date()): DueStatus {
  const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) {
    return { text: `Telat ${Math.abs(diffDays)} hari`, overdue: true };
  }
  if (diffDays === 0) {
    return { text: 'Jatuh tempo hari ini', overdue: false };
  }
  return { text: `H-${diffDays}`, overdue: false };
}

/** "9 Sep 2026, 14:05" — for proof upload timestamps. */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}
