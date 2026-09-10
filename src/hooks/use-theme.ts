import { CategoryColors, Colors } from '@/constants/theme';
import { useResolvedScheme } from '@/features/settings/theme-preference';

/** Theme-aware colour set, respecting the manual Terang/Gelap/Ikuti Sistem choice. */
export function useTheme() {
  return Colors[useResolvedScheme()];
}

/** Per-category accent colours for the current theme. */
export function useCategoryColors() {
  return CategoryColors[useResolvedScheme()];
}
