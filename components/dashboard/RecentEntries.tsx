import { CalendarDays, ChevronRight } from 'lucide-react';
import type { WeightEntry } from '@/lib/types';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatDate as localizedDate, formatNumber as localizedNumber } from '@/lib/i18n';

export function RecentEntries({ entries }: { entries: WeightEntry[] }) {
  const { locale, t } = useLanguage();
  const recent = entries.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return <section className="recent-card surface"><div className="section-heading"><div><h2>{t('Recent entries')}</h2><p>{t('A quick look at each day.')}</p></div><CalendarDays size={18} className="muted-icon" aria-hidden="true" /></div>{recent.length === 0 ? <div className="empty-state"><strong>{t('Nothing logged yet')}</strong><p>{t('Add your first daily weight to start seeing a trend.')}</p></div> : <div className="recent-list">{recent.map((entry, index) => <div className="recent-row" key={entry.id}><div className="recent-date"><span className="recent-day">{localizedDate(locale, entry.date, { day: 'numeric', month: 'short' })}</span>{entry.note && <span>{entry.note}</span>}</div><div className="recent-value"><strong>{localizedNumber(locale, entry.weightKg, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</strong><span>{t('kg')}</span>{index < recent.length - 1 && <ChevronRight size={15} aria-hidden="true" />}</div></div>)}</div>}</section>;
}
