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

function todayLabel() { return new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()); }
function formatNumber(value: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value); }

export default function DashboardPage() {
  const { snapshot } = useSyncExternalStore(subscribeHosted, getHostedState, getHostedServerState);
  const user = snapshot.currentUser;
  const userId = user?.id ?? '';
  const entries = useMemo(() => userId ? getUserWeights(userId, snapshot) : [], [snapshot, userId]);
  const latest = getLatestWeight(entries);
  const previous = getPreviousWeight(entries);
  const streak = getLoggingStreak(entries);
  if (!user) return <AppShell active="home"><div className="app-loading">Preparing your space…</div></AppShell>;
  return <AppShell active="home">
    <div className="dashboard-page app-container">
      <header className="dashboard-header"><div><p className="eyebrow"><span className="eyebrow-line" /> {todayLabel()}</p><h1 className="page-title">Good morning, {user.displayName}.</h1><p className="page-subtitle">Come back to your pace. You do not have to solve everything today.</p></div><div className="streak-chip"><Clock3 size={16} aria-hidden="true" /><strong>{formatNumber(streak)}</strong><span>day streak</span></div></header>
      <WeightHero user={user} latest={latest} previous={previous} />
      <div className="dashboard-grid dashboard-grid-main"><WeightEntryForm /><GoalCard user={user} current={latest?.weightKg ?? user.goal.startWeightKg} /></div>
      <section className="chart-card surface"><div className="section-heading"><div><h2>Weight trend</h2><p>See the shape of your weeks, not just one day.</p></div><Link href="/progress" className="section-link">View details <ArrowRight size={15} aria-hidden="true" /></Link></div><WeightChart entries={entries} /></section>
      <div className="dashboard-grid dashboard-grid-bottom"><RecentEntries entries={entries} /><section className="photo-teaser surface"><div className="photo-teaser-art" aria-hidden="true"><Camera size={28} /><span>In one month,<br />this frame will speak.</span></div><div className="photo-teaser-copy"><span className="mono-label">MONTHLY CHECK-IN</span><h2>Make progress visible.</h2><p>One photo a month tells a fuller story than a scale can.</p><Link href="/progress" className="text-link">Open photo journal <ArrowRight size={15} aria-hidden="true" /></Link></div></section></div>
    </div>
  </AppShell>;
}
