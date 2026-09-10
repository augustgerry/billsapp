/**
 * Country calling codes for the phone-number picker. ISO 3166-1 alpha-2 +
 * E.164 dial code. Ordered roughly by likely relevance for this app, then
 * alphabetically; the picker also has search.
 */

export interface Country {
  iso: string;
  name: string;
  dial: string;
}

/** 🇮🇩 from "ID" — regional-indicator letters. */
export function flagEmoji(iso: string): string {
  if (iso.length !== 2) return '🏳️';
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + (iso.charCodeAt(0) - 65),
    base + (iso.charCodeAt(1) - 65),
  );
}

export const DEFAULT_COUNTRY_ISO = 'ID';

export const COUNTRIES: Country[] = [
  { iso: 'ID', name: 'Indonesia', dial: '+62' },
  { iso: 'MY', name: 'Malaysia', dial: '+60' },
  { iso: 'SG', name: 'Singapore', dial: '+65' },
  { iso: 'TH', name: 'Thailand', dial: '+66' },
  { iso: 'PH', name: 'Philippines', dial: '+63' },
  { iso: 'VN', name: 'Vietnam', dial: '+84' },
  { iso: 'BN', name: 'Brunei', dial: '+673' },
  { iso: 'KH', name: 'Cambodia', dial: '+855' },
  { iso: 'LA', name: 'Laos', dial: '+856' },
  { iso: 'MM', name: 'Myanmar', dial: '+95' },
  { iso: 'TL', name: 'Timor-Leste', dial: '+670' },
  { iso: 'AU', name: 'Australia', dial: '+61' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64' },
  { iso: 'US', name: 'United States', dial: '+1' },
  { iso: 'CA', name: 'Canada', dial: '+1' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44' },
  { iso: 'IN', name: 'India', dial: '+91' },
  { iso: 'CN', name: 'China', dial: '+86' },
  { iso: 'JP', name: 'Japan', dial: '+81' },
  { iso: 'KR', name: 'South Korea', dial: '+82' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852' },
  { iso: 'TW', name: 'Taiwan', dial: '+886' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { iso: 'DE', name: 'Germany', dial: '+49' },
  { iso: 'FR', name: 'France', dial: '+33' },
  { iso: 'NL', name: 'Netherlands', dial: '+31' },
  { iso: 'ES', name: 'Spain', dial: '+34' },
  { iso: 'IT', name: 'Italy', dial: '+39' },
  { iso: 'PT', name: 'Portugal', dial: '+351' },
  { iso: 'SE', name: 'Sweden', dial: '+46' },
  { iso: 'CH', name: 'Switzerland', dial: '+41' },
  { iso: 'IE', name: 'Ireland', dial: '+353' },
  { iso: 'BE', name: 'Belgium', dial: '+32' },
  { iso: 'AT', name: 'Austria', dial: '+43' },
  { iso: 'NO', name: 'Norway', dial: '+47' },
  { iso: 'DK', name: 'Denmark', dial: '+45' },
  { iso: 'FI', name: 'Finland', dial: '+358' },
  { iso: 'PL', name: 'Poland', dial: '+48' },
  { iso: 'CZ', name: 'Czechia', dial: '+420' },
  { iso: 'GR', name: 'Greece', dial: '+30' },
  { iso: 'RU', name: 'Russia', dial: '+7' },
  { iso: 'TR', name: 'Türkiye', dial: '+90' },
  { iso: 'UA', name: 'Ukraine', dial: '+380' },
  { iso: 'BR', name: 'Brazil', dial: '+55' },
  { iso: 'MX', name: 'Mexico', dial: '+52' },
  { iso: 'AR', name: 'Argentina', dial: '+54' },
  { iso: 'CL', name: 'Chile', dial: '+56' },
  { iso: 'CO', name: 'Colombia', dial: '+57' },
  { iso: 'PE', name: 'Peru', dial: '+51' },
  { iso: 'ZA', name: 'South Africa', dial: '+27' },
  { iso: 'NG', name: 'Nigeria', dial: '+234' },
  { iso: 'EG', name: 'Egypt', dial: '+20' },
  { iso: 'KE', name: 'Kenya', dial: '+254' },
  { iso: 'MA', name: 'Morocco', dial: '+212' },
  { iso: 'GH', name: 'Ghana', dial: '+233' },
  { iso: 'PK', name: 'Pakistan', dial: '+92' },
  { iso: 'BD', name: 'Bangladesh', dial: '+880' },
  { iso: 'LK', name: 'Sri Lanka', dial: '+94' },
  { iso: 'NP', name: 'Nepal', dial: '+977' },
  { iso: 'QA', name: 'Qatar', dial: '+974' },
  { iso: 'KW', name: 'Kuwait', dial: '+965' },
  { iso: 'BH', name: 'Bahrain', dial: '+973' },
  { iso: 'OM', name: 'Oman', dial: '+968' },
  { iso: 'IL', name: 'Israel', dial: '+972' },
  { iso: 'JO', name: 'Jordan', dial: '+962' },
  { iso: 'LB', name: 'Lebanon', dial: '+961' },
  { iso: 'AF', name: 'Afghanistan', dial: '+93' },
  { iso: 'AL', name: 'Albania', dial: '+355' },
  { iso: 'DZ', name: 'Algeria', dial: '+213' },
  { iso: 'AO', name: 'Angola', dial: '+244' },
  { iso: 'AM', name: 'Armenia', dial: '+374' },
  { iso: 'AZ', name: 'Azerbaijan', dial: '+994' },
  { iso: 'BO', name: 'Bolivia', dial: '+591' },
  { iso: 'BA', name: 'Bosnia and Herzegovina', dial: '+387' },
  { iso: 'BW', name: 'Botswana', dial: '+267' },
  { iso: 'BG', name: 'Bulgaria', dial: '+359' },
  { iso: 'CM', name: 'Cameroon', dial: '+237' },
  { iso: 'CR', name: 'Costa Rica', dial: '+506' },
  { iso: 'HR', name: 'Croatia', dial: '+385' },
  { iso: 'CY', name: 'Cyprus', dial: '+357' },
  { iso: 'CD', name: 'DR Congo', dial: '+243' },
  { iso: 'DO', name: 'Dominican Republic', dial: '+1' },
  { iso: 'EC', name: 'Ecuador', dial: '+593' },
  { iso: 'SV', name: 'El Salvador', dial: '+503' },
  { iso: 'EE', name: 'Estonia', dial: '+372' },
  { iso: 'ET', name: 'Ethiopia', dial: '+251' },
  { iso: 'GE', name: 'Georgia', dial: '+995' },
  { iso: 'GT', name: 'Guatemala', dial: '+502' },
  { iso: 'HN', name: 'Honduras', dial: '+504' },
  { iso: 'HU', name: 'Hungary', dial: '+36' },
  { iso: 'IS', name: 'Iceland', dial: '+354' },
  { iso: 'IQ', name: 'Iraq', dial: '+964' },
  { iso: 'JM', name: 'Jamaica', dial: '+1' },
  { iso: 'KZ', name: 'Kazakhstan', dial: '+7' },
  { iso: 'KG', name: 'Kyrgyzstan', dial: '+996' },
  { iso: 'LV', name: 'Latvia', dial: '+371' },
  { iso: 'LT', name: 'Lithuania', dial: '+370' },
  { iso: 'LU', name: 'Luxembourg', dial: '+352' },
  { iso: 'MO', name: 'Macau', dial: '+853' },
  { iso: 'MK', name: 'North Macedonia', dial: '+389' },
  { iso: 'MG', name: 'Madagascar', dial: '+261' },
  { iso: 'MW', name: 'Malawi', dial: '+265' },
  { iso: 'MV', name: 'Maldives', dial: '+960' },
  { iso: 'MT', name: 'Malta', dial: '+356' },
  { iso: 'MU', name: 'Mauritius', dial: '+230' },
  { iso: 'MD', name: 'Moldova', dial: '+373' },
  { iso: 'MN', name: 'Mongolia', dial: '+976' },
  { iso: 'ME', name: 'Montenegro', dial: '+382' },
  { iso: 'MZ', name: 'Mozambique', dial: '+258' },
  { iso: 'NA', name: 'Namibia', dial: '+264' },
  { iso: 'NI', name: 'Nicaragua', dial: '+505' },
  { iso: 'PA', name: 'Panama', dial: '+507' },
  { iso: 'PY', name: 'Paraguay', dial: '+595' },
  { iso: 'RO', name: 'Romania', dial: '+40' },
  { iso: 'RW', name: 'Rwanda', dial: '+250' },
  { iso: 'RS', name: 'Serbia', dial: '+381' },
  { iso: 'SN', name: 'Senegal', dial: '+221' },
  { iso: 'SK', name: 'Slovakia', dial: '+421' },
  { iso: 'SI', name: 'Slovenia', dial: '+386' },
  { iso: 'TZ', name: 'Tanzania', dial: '+255' },
  { iso: 'TN', name: 'Tunisia', dial: '+216' },
  { iso: 'UG', name: 'Uganda', dial: '+256' },
  { iso: 'UY', name: 'Uruguay', dial: '+598' },
  { iso: 'UZ', name: 'Uzbekistan', dial: '+998' },
  { iso: 'VE', name: 'Venezuela', dial: '+58' },
  { iso: 'ZM', name: 'Zambia', dial: '+260' },
  { iso: 'ZW', name: 'Zimbabwe', dial: '+263' },
];

export const DEFAULT_COUNTRY: Country =
  COUNTRIES.find((c) => c.iso === DEFAULT_COUNTRY_ISO) ?? COUNTRIES[0];

/** Combine a dial code + locally-typed number into E.164-ish `+62812…`. */
export function toE164(dial: string, localNumber: string): string {
  const digits = localNumber.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return `${dial}${digits}`;
}

/** Local part is 4–14 digits (kept generic — no per-country length rules). */
export function isValidLocalNumber(localNumber: string): boolean {
  return /^0?\d{4,14}$/.test(localNumber.replace(/[^0-9]/g, ''));
}
