'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, Camera, LockKeyhole, PencilLine, Settings2, Target, TrendingDown, Weight } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getHostedServerState, getHostedState, subscribeHosted } from '@/lib/hosted-store';
import { calculateProgress, getLatestWeight, getUserWeights } from '@/lib/selectors';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatDate as localizedDate, formatNumber } from '@/lib/i18n';
import './profile.css';

export default function ProfilePage() {
  const { locale, t } = useLanguage();
  const weight = (value: number) => formatNumber(locale, value, { maximumFractionDigits: 1 });
  const count = (value: number) => formatNumber(locale, value);
  const date = (value: string | undefined) => value ? localizedDate(locale, value, { day: 'numeric', month: 'short', year: 'numeric' }) : t('No date set');
  const { snapshot } = useSyncExternalStore(subscribeHosted, getHostedState, getHostedServerState);
  const user = snapshot.currentUser;
  if (!user) return <AppShell active="profile"><div className="app-loading">{t('Preparing your profile…')}</div></AppShell>;

  const entries = getUserWeights(user.id, snapshot);
  const photos = snapshot.progressPhotos.filter((photo) => photo.userId === user.id);
  const latest = getLatestWeight(entries);
  const start = user.goal.startWeightKg;
  const target = user.goal.targetWeightKg;
  const current = latest?.weightKg ?? start;
  const hasGoal = start > target && target > 0;
  const progress = hasGoal ? calculateProgress(start, target, current) : 0;
  const remaining = hasGoal ? Math.max(0, current - target) : null;

  return (
    <AppShell active="profile">
      <div className="profile-page app-container">
        <header className="profile-page-head">
          <div><p className="eyebrow"><span className="eyebrow-line" /> {t('YOUR SPACE')}</p><h1 className="page-title">{t('Your profile.')}</h1><p className="page-subtitle">{t('A clear view of where you started, where you are, and what comes next.')}</p></div>
          <div className="profile-head-actions"><Link href="/profile#profile-details" className="button button-primary"><PencilLine size={17} aria-hidden="true" /> {t('Edit profile')}</Link><Link href="/settings" className="button button-ghost profile-settings"><Settings2 size={17} aria-hidden="true" /> {t('Settings')}</Link></div>
        </header>

        <section className="profile-hero surface" aria-label={t('Profile summary')}>
          <div className="profile-identity">
            <span className="profile-avatar" aria-hidden="true">{user.initials || user.displayName.slice(0, 1)}</span>
            <div className="profile-identity-copy"><span className="mono-label">{t('HEALTHY MEMBER')}</span><h2>{user.displayName}</h2><p>@{user.username}</p></div>
          </div>
          <div className="profile-hero-bottom"><span><CalendarDays size={16} aria-hidden="true" /> {t('Member since {date}', { date: date(user.createdAt) })}</span><span><LockKeyhole size={16} aria-hidden="true" /> {t('Your personal progress is private')}</span></div>
        </section>

        <section className="profile-metrics" aria-label={t('Your progress at a glance')}>
          <div className="profile-metric surface"><span className="profile-metric-icon"><Weight size={18} aria-hidden="true" /></span><span className="mono-label">{t('CURRENT WEIGHT')}</span><strong>{current > 0 ? weight(current) : '—'}<small>{current > 0 ? t('kg') : ''}</small></strong><p>{latest ? t('Last check-in {date}', { date: date(latest.date) }) : t('Your starting point')}</p></div>
          <div className="profile-metric surface"><span className="profile-metric-icon"><Target size={18} aria-hidden="true" /></span><span className="mono-label">{t('GOAL WEIGHT')}</span><strong>{target > 0 ? weight(target) : '—'}<small>{target > 0 ? t('kg') : ''}</small></strong><p>{remaining === null ? t('Set your goal below') : remaining === 0 ? t('Goal reached') : t('{value} kg to go', { value: weight(remaining) })}</p></div>
          <div className="profile-metric surface"><span className="profile-metric-icon"><TrendingDown size={18} aria-hidden="true" /></span><span className="mono-label">{t('CHECK-INS')}</span><strong>{count(entries.length)}</strong><p>{count(photos.length)} progress {photos.length === 1 ? 'photo' : 'photos'} saved</p></div>
        </section>

        <section className="profile-goal surface" aria-labelledby="profile-goal-title">
          <div className="profile-section-head"><div><span className="mono-label">{t('THE JOURNEY')}</span><h2 id="profile-goal-title">{t('Your goal, in view.')}</h2><p>{hasGoal ? t('From {start} kg to {target} kg, one check-in at a time.', { start: weight(start), target: weight(target) }) : t('Add your starting and goal weights to see your progress.')}</p></div><Link href="/progress" className="section-link">{t('View progress')} <ArrowRight size={16} aria-hidden="true" /></Link></div>
          {hasGoal ? <ProgressBar value={progress} label={t('Progress toward your weight goal')} /> : <p className="profile-goal-empty">{t('Your goal progress will appear here after you save your details.')}</p>}
          <div className="profile-goal-meta"><span>{t('Started {date}', { date: date(user.goal.startDate) })}</span><span>{user.goal.targetDate ? t('Target {date}', { date: date(user.goal.targetDate) }) : t('At your own pace')}</span></div>
        </section>

        <ProfileEditor user={user} />

        <div className="profile-bottom-links"><Link href="/progress" className="profile-bottom-link surface"><Camera size={20} aria-hidden="true" /><span><strong>{t('Progress journal')}</strong><small>{t('Weight history and photos')}</small></span><ArrowRight size={17} aria-hidden="true" /></Link><Link href="/settings" className="profile-bottom-link surface"><Settings2 size={20} aria-hidden="true" /><span><strong>{t('Privacy & settings')}</strong><small>{t('Choose what you share')}</small></span><ArrowRight size={17} aria-hidden="true" /></Link></div>
      </div>
    </AppShell>
  );
}
