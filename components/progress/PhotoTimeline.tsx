/* eslint-disable @next/next/no-img-element -- Supabase signed URLs can change after refresh. */
import { CalendarDays, LockKeyhole } from 'lucide-react';
import type { ProgressPhoto } from '@/lib/types';

function formatDate(date: string) { return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`)); }

export function PhotoTimeline({ photos }: { photos: ProgressPhoto[] }) {
  const items = photos.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!items.length) return <div className="empty-state photo-empty" dir="ltr"><strong>Take your first photo.</strong><p>Use roughly the same light and angle each month to make changes easier to see.</p></div>;
  return <div className="photo-timeline" dir="ltr">{items.map((photo, index) => <article className="photo-timeline-card surface" key={photo.id}><div className="photo-frame"><img src={photo.dataUrl || photo.imageUrl || ''} alt={photo.caption ? `Progress photo: ${photo.caption}` : 'Body progress photo'} loading={index > 1 ? 'lazy' : 'eager'} /></div><div className="photo-card-meta"><div><span className="mono-label">{index === 0 ? 'LATEST' : `MONTH ${items.length - index}`}</span><h3>{photo.caption || 'Progress check-in'}</h3><p><CalendarDays size={13} aria-hidden="true" /> {formatDate(photo.date)}</p></div><span className="private-pill"><LockKeyhole size={12} aria-hidden="true" /> Private</span></div></article>)}</div>;
}
