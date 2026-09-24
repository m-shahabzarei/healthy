import { ArrowDown, ArrowUp, Minus, Target, TrendingDown } from 'lucide-react';
import type { User, WeightEntry } from '@/lib/types';
import { calculateProgress } from '@/lib/selectors';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatNumber as localizedNumber } from '@/lib/i18n';

export function WeightHero({ user, latest, previous }: { user: User; latest: WeightEntry | null; previous: WeightEntry | null }) {
  const { locale, t } = useLanguage();
  const formatNumber = (value: number, fraction = 1) => localizedNumber(locale, value, { maximumFractionDigits: fraction, minimumFractionDigits: fraction });
  const current = latest?.weightKg ?? user.goal.startWeightKg;
  const delta = latest && previous ? latest.weightKg - previous.weightKg : null;
  const progress = calculateProgress(user.goal.startWeightKg, user.goal.targetWeightKg, current);
  const direction = delta === null ? 'neutral' : delta < 0 ? 'down' : delta > 0 ? 'up' : 'neutral';
  const DeltaIcon = direction === 'down' ? ArrowDown : direction === 'up' ? ArrowUp : Minus;
  return (
    <section className="dashboard-hero surface">
      <div className="dashboard-hero-main">
        <div className="hero-card-label"><span className="mono-label">{t('LATEST CHECK-IN')}</span><span className="hero-live-dot" /> {t('Latest')}</div>
        <div className="weight-number"><strong>{formatNumber(current)}</strong><span>{t('kg')}</span></div>
        <div className={`weight-delta ${direction}`}><DeltaIcon size={16} aria-hidden="true" /><span>{delta === null ? t('Add your first check-in') : t(delta < 0 ? '{value} kg lower than your last entry' : delta > 0 ? '{value} kg higher than your last entry' : '{value} kg with no change', { value: formatNumber(Math.abs(delta)) })}</span></div>
      </div>
      <div className="dashboard-hero-side">
        <div className="goal-mini-head"><span><Target size={16} aria-hidden="true" /> {t('Current goal')}</span><strong>{formatNumber(user.goal.targetWeightKg)} {t('kg')}</strong></div>
        <ProgressBar value={progress} label={t('Progress to goal')} />
        <div className="hero-goal-meta"><span>{t('Start: {value} kg', { value: formatNumber(user.goal.startWeightKg) })}</span><span>{progress >= 100 ? t('Goal reached') : t('{value} kg to goal', { value: formatNumber(Math.max(0, current - user.goal.targetWeightKg)) })}</span></div>
        <div className="hero-motivation"><TrendingDown size={15} aria-hidden="true" /> {t('Slow progress is still progress.')}</div>
      </div>
    </section>
  );
}
