import { ArrowRight, Flag } from 'lucide-react';
import type { User } from '@/lib/types';
import { calculateProgress } from '@/lib/selectors';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatNumber } from '@/lib/i18n';

export function GoalCard({ user, current }: { user: User; current: number }) {
  const { locale, t } = useLanguage();
  const number = (value: number) => formatNumber(locale, value, { maximumFractionDigits: 1 });
  const progress = calculateProgress(user.goal.startWeightKg, user.goal.targetWeightKg, current);
  const remaining = Math.max(0, current - user.goal.targetWeightKg);
  return <section className="goal-card surface"><div className="goal-card-top"><span className="goal-icon"><Flag size={18} aria-hidden="true" /></span><div><span className="mono-label">{t('YOUR NORTH STAR')}</span><h2>{t('A small goal. A big journey.')}</h2></div></div><p>{remaining > 0 ? t('Just {value} kg to go.', { value: number(remaining) }) : t('You reached your goal. Now keep it going.')}</p><ProgressBar value={progress} label={t('Overall progress')} /><div className="goal-card-bottom"><span>{t('From {start} to {target} kg', { start: number(user.goal.startWeightKg), target: number(user.goal.targetWeightKg) })}</span><span className="goal-arrow">{t('Keep going')} <ArrowRight size={16} aria-hidden="true" /></span></div></section>;
}
