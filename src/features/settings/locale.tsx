/**
 * App language: Bahasa Indonesia / English, persisted per device. Mirrors
 * `theme-preference`. Default is `id`.
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

import { STRINGS, type StringKey } from './strings';

export type Lang = 'id' | 'en';

const STORAGE_KEY = 'kongsi.lang';

export type TFn = (key: StringKey, vars?: Record<string, string | number>) => string;

interface LocaleValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFn;
}

const LocaleContext = createContext<LocaleValue | null>(null);

function translate(
  lang: Lang,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const entry = STRINGS[key];
  let out = entry ? entry[lang] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return out;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id');

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => {
        if (active && (v === 'id' || v === 'en')) setLangState(v);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    void SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<LocaleValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Falls back to Indonesian outside the provider. */
export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    lang: 'id',
    setLang: () => undefined,
    t: (key, vars) => translate('id', key, vars),
  };
}

/** Shorthand: `const t = useT()`. */
export function useT(): TFn {
  return useLocale().t;
}
