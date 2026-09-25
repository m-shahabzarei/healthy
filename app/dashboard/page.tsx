'use client';

import Link from 'next/link';
import { ArrowRight, Camera, Clock3 } from 'lucide-react';
import { useMemo, useSyncExternalStore } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { WeightChart } from '@/components/ui/WeightChart';
import { WeightHero } from '@/components/dashboard/WeightHero';
import { WeightEntryForm } from '@/components/dashboard/WeightEntryForm';
import { GoalCard } from '@/components/dashboard/GoalCard';
import { RecentEntries } from '@/components/dashboard/RecentEntries';
import { getHostedServerState, getHostedState, subscribeHosted } from '@/lib/hosted-store';
import { getLatestWeight, getLoggingStreak, getPreviousWeight, getUserWeights } from '@/lib/selectors';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatDate, formatNumber } from '@/lib/i18n';

export default function DashboardPage() {
  const { locale, t } = useLanguage();
  const { snapshot } = useSyncExternalStore(subscribeHosted, getHostedState, getHostedServerState);
  const user = snapshot.currentUser;
  const userId = user?.id ?? '';
  const entries = useMemo(() => userId ? getUserWeights(userId, snapshot) : [], [snapshot, userId]);
  const latest = getLatestWeight(entries);
  const previous = getPreviousWeight(entries);
  const streak = getLoggingStreak(entries);
  if (!user) return <AppShell active="home"><div className="app-loading">{t('Preparing your space…')}</div></AppShell>;
  return <AppShell active="home">
    <div className="dashboard-page app-container">
      <header className="dashboard-header"><h1 className="eyebrow"><span className="eyebrow-line" /> {formatDate(locale, new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</h1><div className="streak-chip"><Clock3 size={16} aria-hidden="true" /><strong>{formatNumber(locale, streak, { maximumFractionDigits: 0 })}</strong><span>{t('day streak')}</span></div></header>
      <WeightHero user={user} latest={latest} previous={previous} />
      <div className="dashboard-grid dashboard-grid-main"><WeightEntryForm /><GoalCard user={user} current={latest?.weightKg ?? user.goal.startWeightKg} /></div>
      <section className="chart-card surface"><div className="section-heading"><div><h2>{t('Weight trend')}</h2><p>{t('See the shape of your weeks, not just one day.')}</p></div><Link href="/progress" className="section-link">{t('View details')} <ArrowRight size={15} aria-hidden="true" /></Link></div><WeightChart entries={entries} /></section>
      <div className="dashboard-grid dashboard-grid-bottom"><RecentEntries entries={entries} /><section className="photo-teaser surface"><div className="photo-teaser-art" aria-hidden="true"><Camera size={28} /><span>{t('In one month,')}<br />{t('this frame will speak.')}</span></div><div className="photo-teaser-copy"><span className="mono-label">{t('MONTHLY CHECK-IN')}</span><h2>{t('Make progress visible.')}</h2><p>{t('One photo a month tells a fuller story than a scale can.')}</p><Link href="/progress" className="text-link">{t('Open photo journal')} <ArrowRight size={15} aria-hidden="true" /></Link></div></section></div>
    </div>
  </AppShell>;
}
