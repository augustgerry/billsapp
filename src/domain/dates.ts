/**
 * Date helpers. Ported from `kongsi-pilot.html`.
 *
 * Every function takes an optional `now` (deterministic tests) and `locale`.
 */

import type { Locale } from './i18n';
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

export const MONTH_NAMES_FULL_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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

export const MONTH_NAMES_SHORT_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function fullMonth(index: number, locale: Locale): string {
  return (locale === 'en' ? MONTH_NAMES_FULL_EN : MONTH_NAMES_FULL)[index];
}
function shortMonth(index: number, locale: Locale): string {
  return (locale === 'en' ? MONTH_NAMES_SHORT_EN : MONTH_NAMES_SHORT)[index];
}

/** Current month bucket key, `YYYY-MM`. */
export function monthKey(now: Date = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** "September 2026" */
export function monthLabel(now: Date = new Date(), locale: Locale = 'id'): string {
  return `${fullMonth(now.getMonth(), locale)} ${now.getFullYear()}`;
}

/** "2026-09" -> "Sep 26" */
export function monthKeyLabel(key: MonthKey, locale: Locale = 'id'): string {
  const [year, month] = key.split('-');
  return `${shortMonth(parseInt(month, 10) - 1, locale)} ${year.slice(2)}`;
}

export interface DueStatus {
  text: string;
  overdue: boolean;
}

/** Countdown text for a bill's due day *this* calendar month. */
export function daysStatus(
  dueDay: number,
  now: Date = new Date(),
  locale: Locale = 'id',
): DueStatus {
  const due = new Date(now.getFullYear(), now.getMonth(), dueDay);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return {
      text: locale === 'en' ? `${n} day${n > 1 ? 's' : ''} late` : `Telat ${n} hari`,
      overdue: true,
    };
  }
  if (diffDays === 0) {
    return {
      text: locale === 'en' ? 'Due today' : 'Jatuh tempo hari ini',
      overdue: false,
    };
  }
  return { text: `H-${diffDays}`, overdue: false };
}

/** "9 Sep 2026, 14:05" */
export function formatDateTime(ts: number, locale: Locale = 'id'): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${shortMonth(d.getMonth(), locale)} ${d.getFullYear()}, ${hh}:${mm}`;
}
