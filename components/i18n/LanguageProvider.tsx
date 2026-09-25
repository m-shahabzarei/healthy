'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate, type Locale } from '@/lib/i18n';

const STORAGE_KEY = 'healthy.locale';

function applyDocumentLanguage(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  document.title = translate(locale, 'Healthy — Your weight, your pace');
}

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setCurrentLocale] = useState<Locale>('en');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const initialLocale = saved === 'fa' ? 'fa' : 'en';
      setCurrentLocale(initialLocale);
      applyDocumentLanguage(initialLocale);
    } catch {
      applyDocumentLanguage('en');
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const nextLocale = event.newValue === 'fa' ? 'fa' : 'en';
      setCurrentLocale(nextLocale);
      applyDocumentLanguage(nextLocale);
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setCurrentLocale(nextLocale);
    applyDocumentLanguage(nextLocale);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      // Keep the choice active for this session when browser storage is unavailable.
    }
  }, []);

  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(locale, key, values), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageProvider is missing.');
  return context;
}
