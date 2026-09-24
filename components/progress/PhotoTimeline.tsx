/* eslint-disable @next/next/no-img-element -- Supabase signed URLs can change after refresh. */
import { CalendarDays, LockKeyhole } from 'lucide-react';
import type { ProgressPhoto } from '@/lib/types';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatDate as localizedDate, formatNumber } from '@/lib/i18n';

export function PhotoTimeline({ photos }: { photos: ProgressPhoto[] }) {
  const { locale, t } = useLanguage();
  const items = photos.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!items.length) return <div className="empty-state photo-empty"><strong>{t('Take your first photo.')}</strong><p>{t('Use roughly the same light and angle each month to make changes easier to see.')}</p></div>;
  return <div className="photo-timeline">{items.map((photo, index) => <article className="photo-timeline-card surface" key={photo.id}><div className="photo-frame"><img src={photo.dataUrl || photo.imageUrl || ''} alt={photo.caption ? t('Progress photo: {caption}', { caption: photo.caption }) : t('Body progress photo')} loading={index > 1 ? 'lazy' : 'eager'} /></div><div className="photo-card-meta"><div><span className="mono-label">{index === 0 ? t('LATEST') : t('MONTH {number}', { number: formatNumber(locale, items.length - index) })}</span><h3>{photo.caption || t('Progress check-in')}</h3><p><CalendarDays size={13} aria-hidden="true" /> {localizedDate(locale, photo.date, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div><span className="private-pill"><LockKeyhole size={12} aria-hidden="true" /> {t('Private')}</span></div></article>)}</div>;
}
