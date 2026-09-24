'use client';

import { Image as ImageIcon, LineChart } from 'lucide-react';
import { useMemo, useSyncExternalStore } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PhotoCompare } from '@/components/progress/PhotoCompare';
import { PhotoTimeline } from '@/components/progress/PhotoTimeline';
import { PhotoUploadForm } from '@/components/progress/PhotoUploadForm';
import { WeightChart } from '@/components/ui/WeightChart';
import { getHostedServerState, getHostedState, subscribeHosted } from '@/lib/hosted-store';
import { getUserWeights } from '@/lib/selectors';
import { useLanguage } from '@/components/i18n/LanguageProvider';

export default function ProgressPage() {
  const { t } = useLanguage();
  const { snapshot } = useSyncExternalStore(subscribeHosted, getHostedState, getHostedServerState); const user = snapshot.currentUser; const userId = user?.id ?? '';
  const entries = useMemo(() => userId ? getUserWeights(userId, snapshot) : [], [snapshot, userId]); const photos = useMemo(() => userId ? snapshot.progressPhotos.filter((photo) => photo.userId === userId) : [], [snapshot.progressPhotos, userId]);
  if (!user) return <AppShell active="progress"><div className="app-loading">{t('Preparing your space…')}</div></AppShell>;
  return <AppShell active="progress"><div className="progress-page app-container"><header className="progress-header"><div><p className="eyebrow"><span className="eyebrow-line" /> {t('Take the long view')}</p><h1 className="page-title">{t('Progress,')}<br /><em>{t('made visible.')}</em></h1><p className="page-subtitle">{t('Put the numbers beside the pictures and let the story get clearer.')}</p></div><div className="progress-header-mark"><LineChart size={28} aria-hidden="true" /><span className="mono-label">{t('YOUR LONG VIEW')}</span></div></header><section className="chart-card surface"><div className="section-heading"><div><h2>{t('Weight trend')}</h2><p>{t('Every check-in is a small point on the path.')}</p></div></div><WeightChart entries={entries} /></section><div className="progress-divider"><span className="mono-label">{t('MONTHLY PHOTO JOURNAL')}</span><span /></div><PhotoUploadForm /><PhotoCompare photos={photos} /><section className="timeline-section"><div className="section-heading"><div><h2>{t('Photo archive')}</h2><p>{t('Keep the light, angle, and distance as consistent as you can.')}</p></div><ImageIcon size={19} className="muted-icon" aria-hidden="true" /></div><PhotoTimeline photos={photos} /></section></div></AppShell>;
}
