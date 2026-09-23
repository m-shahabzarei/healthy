/* eslint-disable @next/next/no-img-element -- Supabase signed URLs can change after refresh. */
import { ArrowLeftRight } from 'lucide-react';
import type { ProgressPhoto } from '@/lib/types';

function formatDate(date: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)); }

export function PhotoCompare({ photos }: { photos: ProgressPhoto[] }) {
  const items = photos.slice().sort((a, b) => a.date.localeCompare(b.date)); if (items.length < 2) return null;
  const first = items[0]; const latest = items[items.length - 1];
  return <section className="photo-compare surface" dir="ltr"><div className="section-heading"><div><h2>Then and now</h2><p>See the changes side by side.</p></div><ArrowLeftRight size={19} className="muted-icon" aria-hidden="true" /></div><div className="compare-grid"><div className="compare-item"><div className="compare-frame"><img src={first.dataUrl || first.imageUrl || ''} alt="Earliest progress photo" /></div><span>Start · {formatDate(first.date)}</span></div><div className="compare-connector" aria-hidden="true">→</div><div className="compare-item"><div className="compare-frame"><img src={latest.dataUrl || latest.imageUrl || ''} alt="Latest progress photo" /></div><span>Latest · {formatDate(latest.date)}</span></div></div></section>;
}
