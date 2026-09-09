/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Palette. The `dark` set is the primary aesthetic (ported from the iOS-dark
 * look of `kongsi-pilot.html`); `light` mirrors every key so the app stays
 * theme-aware. Keep both objects key-for-key identical.
 */
export const Colors = {
  light: {
    text: '#000000',
    background: '#F2F2F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    textFaint: '#8A8A8E',
    surface: '#FFFFFF',
    surface2: '#EFEFF4',
    border: '#D1D1D6',
    primary: '#0A84FF',
    primaryText: '#0A6DD8',
    primaryTint: 'rgba(10,132,255,0.12)',
    success: '#248A3D',
    successTint: 'rgba(36,138,61,0.14)',
    danger: '#D70015',
    dangerTint: 'rgba(215,0,21,0.12)',
    gold: '#A05A00',
    goldTint: 'rgba(160,90,0,0.12)',
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
    primary: '#0A84FF',
    primaryText: '#409CFF',
    primaryTint: 'rgba(10,132,255,0.16)',
    success: '#32D74B',
    successTint: 'rgba(50,215,75,0.16)',
    danger: '#FF453A',
    dangerTint: 'rgba(255,69,58,0.16)',
    gold: '#FF9F0A',
    goldTint: 'rgba(255,159,10,0.16)',
  },
} as const;

/** Icon + accent colour per bill category (matches the prototype). */
export const CategoryColors = {
  Listrik: '#0A84FF',
  Air: '#64D2FF',
  WiFi: '#BF5AF2',
  'Tagihan Rumah': '#FF9F0A',
  Cicilan: '#8E8E93',
  Lainnya: '#98989D',
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
