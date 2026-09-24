'use client';

import { useLanguage } from './LanguageProvider';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();
  const next = locale === 'en' ? 'fa' : 'en';
  return <button type="button" className={`language-switcher ${className}`} dir="ltr" lang={next} onClick={() => setLocale(next)} aria-label={locale === 'en' ? 'Switch to Persian' : 'تغییر زبان به انگلیسی'} title={locale === 'en' ? 'فارسی' : 'English'}>{locale === 'en' ? 'فا' : 'EN'}<span className="sr-only">{t('Language')}</span></button>;
}
