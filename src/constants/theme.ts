/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Palette. Accent is a muted, warm gold (Tricount-inspired). `primaryOn` is the
 * dark ink to place on a solid gold surface — never white, for contrast.
 *
 * Status colours (`success`/`danger`/`gold`) and `CategoryColors` are semantic
 * and stay distinct from the accent so "action" never reads as "status".
 * Keep both objects key-for-key identical.
 */
export const Colors = {
  light: {
    text: '#000000',
    background: '#F2F2F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E5E5EA',
    textSecondary: '#55555B',
    textFaint: '#8E8E93',
    surface: '#FFFFFF',
    surface2: '#ECECF1',
    border: '#D6D6DC',
    primary: '#9C7A1E',
    primaryText: '#8A6B18',
    primaryTint: 'rgba(156,122,30,0.12)',
    primaryOn: '#1C1C1E',
    success: '#1E7A34',
    successTint: 'rgba(30,122,52,0.13)',
    danger: '#CE0016',
    dangerTint: 'rgba(206,0,22,0.10)',
    gold: '#A85800',
    goldTint: 'rgba(168,88,0,0.12)',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2C2C2E',
    textSecondary: '#98989D',
    textFaint: '#636366',
    surface: '#1C1C1E',
    surface2: '#2C2C2E',
    border: '#38383A',
    primary: '#D6AE52',
    primaryText: '#D6AE52',
    primaryTint: 'rgba(214,174,82,0.16)',
    primaryOn: '#1C1C1E',
    success: '#32D74B',
    successTint: 'rgba(50,215,75,0.16)',
    danger: '#FF453A',
    dangerTint: 'rgba(255,69,58,0.16)',
    gold: '#FF9F0A',
    goldTint: 'rgba(255,159,10,0.16)',
  },
} as const;

/**
 * Accent colour per bill category, per theme. Dark = prototype hues; light =
 * a touch deeper so coloured text still reads on white. Use `useCategoryColors()`.
 */
export const CategoryColors = {
  dark: {
    Listrik: '#0A84FF',
    Air: '#64D2FF',
    WiFi: '#BF5AF2',
    'Tagihan Rumah': '#FF9F0A',
    Cicilan: '#98989D',
    Lainnya: '#8E8E93',
  },
  light: {
    Listrik: '#0A6DD8',
    Air: '#0090C4',
    WiFi: '#9A38D6',
    'Tagihan Rumah': '#B25000',
    Cicilan: '#6C6C70',
    Lainnya: '#8E8E93',
  },
} as const;

export const CategoryIcons = {
  Listrik: '⚡',
  Air: '💧',
  WiFi: '📶',
  'Tagihan Rumah': '🏠',
  Cicilan: '💳',
  Lainnya: '📄',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
