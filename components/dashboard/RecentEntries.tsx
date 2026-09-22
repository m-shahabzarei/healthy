import { CalendarDays, ChevronRight } from 'lucide-react';
import type { WeightEntry } from '@/lib/types';

function formatDate(date: string) { return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`)); }
function formatNumber(value: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value); }

export function RecentEntries({ entries }: { entries: WeightEntry[] }) {
  const recent = entries.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return <section className="recent-card surface" dir="ltr"><div className="section-heading"><div><h2>Recent entries</h2><p>A quick look at each day.</p></div><CalendarDays size={18} className="muted-icon" aria-hidden="true" /></div>{recent.length === 0 ? <div className="empty-state"><strong>Nothing logged yet</strong><p>Add your first daily weight to start seeing a trend.</p></div> : <div className="recent-list">{recent.map((entry, index) => <div className="recent-row" key={entry.id}><div className="recent-date"><span className="recent-day">{formatDate(entry.date)}</span>{entry.note && <span>{entry.note}</span>}</div><div className="recent-value"><strong>{formatNumber(entry.weightKg)}</strong><span>kg</span>{index < recent.length - 1 && <ChevronRight size={15} aria-hidden="true" />}</div></div>)}</div>}</section>;
}
