'use client';

import Link from 'next/link';
import { Activity, ArrowRight, Camera, Check, Sparkles, Users } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatNumber } from '@/lib/i18n';

const previewRows = [
  { label: 'Today\'s weight', value: '84.6', unit: 'kg', tone: 'accent' },
  { label: 'This month', value: '−2.4', unit: 'kg', tone: 'muted' },
  { label: 'Day streak', value: '12', unit: 'days', tone: 'muted' },
];

export default function LandingPage() {
  const { locale, t } = useLanguage();
  return (
    <main className="landing-page">
      <div className="landing-noise" aria-hidden="true" />
      <header className="site-header page-gutter">
        <Link href="/" className="brand-mark" aria-label={t('Healthy home')}>
          <span className="brand-dot" aria-hidden="true" />
          {t('Healthy')}
        </Link>
        <nav className="header-nav" aria-label={t('Main navigation')}>
          <LanguageSwitcher />
          <Link href="/login" className="header-link">{t('Log in')}</Link>
          <Link href="/register" className="header-cta">{t('Start your journey')} <ArrowRight size={16} aria-hidden="true" /></Link>
        </nav>
      </header>

      <section className="landing-hero page-gutter" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> {t('A quiet space to keep going')}</p>
          <h1 id="hero-title">{t('Every day,')}<br /><em>{t('one step')}</em> {t('lighter.')}</h1>
          <p className="hero-description">
            {t('Log your weight, see the trend, and build a record that reminds you how far you have come.')}
          </p>
          <div className="hero-actions">
            <Link href="/register" className="button button-primary">{t('Begin my journey')} <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/login" className="text-link">{t('I already have an account')}</Link>
          </div>
          <div className="hero-note"><Check size={15} aria-hidden="true" /> {t('Your real check-ins stay synced to your account.')}</div>
        </div>

        <div className="hero-preview" aria-label={t('Healthy dashboard preview')}>
          <div className="preview-topline">
            <span className="mono-label">{t('YOUR JOURNEY / TODAY')}</span>
            <span className="preview-status"><span className="status-dot" /> {t('On track')}</span>
          </div>
          <div className="preview-heading">
            <span className="preview-greeting">{t('Good morning, you')}</span>
            <strong>{t('Steady looks good.')}</strong>
          </div>
          <div className="preview-chart" aria-hidden="true">
            <div className="chart-grid grid-one" /><div className="chart-grid grid-two" /><div className="chart-grid grid-three" />
            <svg viewBox="0 0 420 150" role="presentation" preserveAspectRatio="none">
              <path d="M0 35 C35 50 45 20 78 45 S120 84 152 66 S198 32 226 64 S270 74 300 89 S344 78 372 105 S403 96 420 116" fill="none" stroke="currentColor" strokeWidth="3" />
              <circle cx="420" cy="116" r="5" fill="var(--accent)" />
            </svg>
            <span className="chart-latest" dir="ltr">{formatNumber(locale, -4.8, { minimumFractionDigits: 1 })} {t('kg')}</span>
          </div>
          <div className="preview-stat-grid">
            {previewRows.map((row) => (
              <div className={`preview-stat ${row.tone}`} key={row.label}>
                <span>{t(row.label)}</span>
                <strong>{formatNumber(locale, Number(row.value.replace('−', '-')), { minimumFractionDigits: row.value.includes('.') ? 1 : 0 })} <small>{t(row.unit)}</small></strong>
              </div>
            ))}
          </div>
          <div className="preview-footer"><span>{t('Last check-in: today, 7:40 AM')}</span><span className="preview-arrow">↗</span></div>
        </div>
      </section>

      <section className="feature-strip page-gutter" aria-labelledby="feature-title">
        <div className="section-kicker"><span className="mono-label">{t('WHY HEALTHY')}</span><span className="section-rule" /></div>
        <h2 id="feature-title">{t('Small, but')} <span>{t('real.')}</span></h2>
        <div className="feature-grid">
          <article className="feature-card"><div className="feature-icon"><Activity size={20} aria-hidden="true" /></div><h3>{t('Trend over obsession')}</h3><p>{t('A simple chart that shows the story of your weeks, not just one reading.')}</p></article>
          <article className="feature-card"><div className="feature-icon"><Camera size={20} aria-hidden="true" /></div><h3>{t('Proof in pictures')}</h3><p>{t('Add one monthly photo and notice what the scale cannot always tell you.')}</p></article>
          <article className="feature-card"><div className="feature-icon"><Users size={20} aria-hidden="true" /></div><h3>{t('Quiet encouragement')}</h3><p>{t('Share meaningful wins with the community and leave a little encouragement behind.')}</p></article>
        </div>
      </section>

      <footer className="landing-footer page-gutter"><span><Sparkles size={15} aria-hidden="true" /> {t('Made for a personal pace')}</span><span className="mono-label">{t('HEALTHY / 2026')}</span></footer>
    </main>
  );
}
