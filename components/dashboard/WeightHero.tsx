import { ArrowDown, ArrowUp, Minus, Target, TrendingDown } from 'lucide-react';
import type { User, WeightEntry } from '@/lib/types';
import { calculateProgress } from '@/lib/selectors';
import { ProgressBar } from '@/components/ui/ProgressBar';

function formatNumber(value: number, fraction = 1) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: fraction, minimumFractionDigits: fraction }).format(value); }

export function WeightHero({ user, latest, previous }: { user: User; latest: WeightEntry | null; previous: WeightEntry | null }) {
  const current = latest?.weightKg ?? user.goal.startWeightKg;
  const delta = latest && previous ? latest.weightKg - previous.weightKg : null;
  const progress = calculateProgress(user.goal.startWeightKg, user.goal.targetWeightKg, current);
  const direction = delta === null ? 'neutral' : delta < 0 ? 'down' : delta > 0 ? 'up' : 'neutral';
  const DeltaIcon = direction === 'down' ? ArrowDown : direction === 'up' ? ArrowUp : Minus;
  return (
    <section className="dashboard-hero surface" dir="ltr">
      <div className="dashboard-hero-main">
        <div className="hero-card-label"><span className="mono-label">LATEST CHECK-IN</span><span className="hero-live-dot" /> Latest</div>
        <div className="weight-number"><strong>{formatNumber(current)}</strong><span>kg</span></div>
        <div className={`weight-delta ${direction}`}><DeltaIcon size={16} aria-hidden="true" /><span>{delta === null ? 'Add your first check-in' : `${formatNumber(Math.abs(delta))} kg ${delta < 0 ? 'lower than your last entry' : delta > 0 ? 'higher than your last entry' : 'with no change'}`}</span></div>
      </div>
      <div className="dashboard-hero-side">
        <div className="goal-mini-head"><span><Target size={16} aria-hidden="true" /> Current goal</span><strong>{formatNumber(user.goal.targetWeightKg)} kg</strong></div>
        <ProgressBar value={progress} label="Progress to goal" />
        <div className="hero-goal-meta"><span>Start: {formatNumber(user.goal.startWeightKg)} kg</span><span>{progress >= 100 ? 'Goal reached' : `${formatNumber(Math.max(0, current - user.goal.targetWeightKg))} kg to goal`}</span></div>
        <div className="hero-motivation"><TrendingDown size={15} aria-hidden="true" /> Slow progress is still progress.</div>
      </div>
    </section>
  );
}
