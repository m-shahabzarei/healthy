/* eslint-disable @next/next/no-img-element -- Supabase signed URLs can change after refresh. */
import { ArrowLeftRight } from 'lucide-react';
import type { ProgressPhoto } from '@/lib/types';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatDate as localizedDate } from '@/lib/i18n';

export function PhotoCompare({ photos }: { photos: ProgressPhoto[] }) {
  const { locale, t } = useLanguage();
  const items = photos.slice().sort((a, b) => a.date.localeCompare(b.date)); if (items.length < 2) return null;
  const first = items[0]; const latest = items[items.length - 1];
  return <section className="photo-compare surface"><div className="section-heading"><div><h2>{t('Then and now')}</h2><p>{t('See the changes side by side.')}</p></div><ArrowLeftRight size={19} className="muted-icon" aria-hidden="true" /></div><div className="compare-grid"><div className="compare-item"><div className="compare-frame"><img src={first.dataUrl || first.imageUrl || ''} alt={t('Earliest progress photo')} /></div><span>{t('Start · {date}', { date: localizedDate(locale, first.date, { month: 'short', year: 'numeric' }) })}</span></div><div className="compare-connector" aria-hidden="true">→</div><div className="compare-item"><div className="compare-frame"><img src={latest.dataUrl || latest.imageUrl || ''} alt={t('Latest progress photo')} /></div><span>{t('Latest · {date}', { date: localizedDate(locale, latest.date, { month: 'short', year: 'numeric' }) })}</span></div></div></section>;
}
