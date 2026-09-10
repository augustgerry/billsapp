import type { BillCategory } from '../types/models';
import type { Locale } from './i18n';

/**
 * Display label for a bill category. The stored value (and the DB CHECK) is
 * always the Indonesian term — this is presentation only.
 */
const LABELS: Record<BillCategory, { id: string; en: string }> = {
  Listrik: { id: 'Listrik', en: 'Electricity' },
  Air: { id: 'Air', en: 'Water' },
  WiFi: { id: 'WiFi', en: 'WiFi' },
  'Tagihan Rumah': { id: 'Tagihan Rumah', en: 'Household' },
  Cicilan: { id: 'Cicilan', en: 'Installment' },
  Lainnya: { id: 'Lainnya', en: 'Other' },
};

export function categoryLabel(
  category: BillCategory,
  locale: Locale = 'id',
): string {
  return LABELS[category]?.[locale] ?? category;
}
