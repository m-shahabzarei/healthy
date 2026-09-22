import { ArrowRight, Flag } from 'lucide-react';
import type { User } from '@/lib/types';
import { calculateProgress } from '@/lib/store';
import { ProgressBar } from '@/components/ui/ProgressBar';

export function GoalCard({ user, current }: { user: User; current: number }) {
  const progress = calculateProgress(user.goal.startWeightKg, user.goal.targetWeightKg, current);
  const remaining = Math.max(0, current - user.goal.targetWeightKg);
  return <section className="goal-card surface" dir="ltr"><div className="goal-card-top"><span className="goal-icon"><Flag size={18} aria-hidden="true" /></span><div><span className="mono-label">YOUR NORTH STAR</span><h2>A small goal. A big journey.</h2></div></div><p>{remaining > 0 ? `Just ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(remaining)} kg to go.` : 'You reached your goal. Now keep it going.'}</p><ProgressBar value={progress} label="Overall progress" /><div className="goal-card-bottom"><span>From {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(user.goal.startWeightKg)} to {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(user.goal.targetWeightKg)} kg</span><span className="goal-arrow">Keep going <ArrowRight size={16} aria-hidden="true" /></span></div></section>;
}
