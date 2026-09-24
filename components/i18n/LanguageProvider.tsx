'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { translate } from '@/lib/i18n';

type LanguageContextValue = {
  locale: 'en';
  t: (key: string, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate('en', key, values), []);
  const value = useMemo(() => ({ locale: 'en' as const, t }), [t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageProvider is missing.');
  return context;
}
