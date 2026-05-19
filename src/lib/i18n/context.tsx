"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  TRANSLATIONS,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";

const STORAGE_KEY = "hollap.locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isLocale(stored)) {
        setLocaleState(stored);
        document.documentElement.lang = stored;
      }
    } catch {
      // ignore
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const dict = TRANSLATIONS[locale];
      const fallback = TRANSLATIONS[DEFAULT_LOCALE];
      const template = (dict[key] ?? fallback[key] ?? String(key)) as string;
      return interpolate(template, vars);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Allow component imports outside provider during SSR/edge cases by returning a no-op.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key, vars) => interpolate(
        (TRANSLATIONS[DEFAULT_LOCALE][key] ?? String(key)) as string,
        vars,
      ),
    };
  }
  return ctx;
}
