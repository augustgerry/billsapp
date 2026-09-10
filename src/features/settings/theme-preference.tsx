/**
 * App-wide theme preference: an explicit Terang / Gelap / Ikuti Sistem choice,
 * persisted per device. `resolved` is the concrete 'light' | 'dark' that
 * `useTheme()` and the navigation ThemeProvider consume.
 */

import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

export type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'kongsi.theme-pref';

interface ThemePreferenceValue {
  pref: ThemePref;
  resolved: 'light' | 'dark';
  setPref: (pref: ThemePref) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

function isPref(v: string | null): v is ThemePref {
  return v === 'light' || v === 'dark' || v === 'system';
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => {
        if (active && isPref(v)) setPrefState(v);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    void SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemePreferenceValue>(() => {
    const resolved: 'light' | 'dark' =
      pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
    return { pref, resolved, setPref };
  }, [pref, system, setPref]);

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

/** Resolved 'light' | 'dark' — safe to call outside the provider (defaults via system). */
export function useResolvedScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemePreferenceContext);
  const system = useColorScheme();
  if (ctx) return ctx.resolved;
  return system === 'dark' ? 'dark' : 'light';
}

export function useThemePreference(): ThemePreferenceValue {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used inside <ThemePreferenceProvider>');
  }
  return ctx;
}
