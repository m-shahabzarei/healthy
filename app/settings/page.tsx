'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, LogOut, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { translateError } from '@/lib/i18n';
import {
  getHostedServerState,
  getHostedState,
  logoutHosted,
  refreshHostedData,
  subscribeHosted,
  updateHostedProfile,
} from '@/lib/hosted-store';

type BusyAction = 'feed' | 'refresh' | 'logout' | null;

export default function SettingsPage() {
  const { locale, setLocale, t } = useLanguage();
  const router = useRouter();
  const { snapshot } = useSyncExternalStore(subscribeHosted, getHostedState, getHostedServerState);
  const user = snapshot.currentUser;
  const feedOptIn = user?.feedOptIn ?? true;
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleFeedPreference() {
    if (busyAction) return;
    setBusyAction('feed');
    setFeedback(null);
    try {
      await updateHostedProfile({ feedOptIn: !feedOptIn });
      setFeedback({
        type: 'success',
        text: feedOptIn ? 'Automatic activity sharing is off.' : 'Automatic activity sharing is on.',
      });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Could not update your feed preference.' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefresh() {
    if (busyAction) return;
    setBusyAction('refresh');
    setFeedback(null);
    try {
      await refreshHostedData();
      setFeedback({ type: 'success', text: 'Your cloud data is up to date.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Could not refresh your cloud data.' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLogout() {
    if (busyAction) return;
    setBusyAction('logout');
    setFeedback(null);
    try {
      await logoutHosted();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Could not log out. Please try again.' });
      setBusyAction(null);
    }
  }

  return (
    <AppShell active="home">
      <div className="app-container settings-page">
        <p className="eyebrow"><span className="eyebrow-line" /> {t('Preferences')}</p>
        <h1 className="page-title">{t('Settings.')}</h1>
        <p className="page-subtitle">{t('A few clear controls for your Healthy account.')}</p>
        <section className="settings-list surface">
          <div>
            <strong>{t('Measurement unit')}</strong>
            <span>{t('Kilograms (kg)')}</span>
          </div>
          <div className="settings-preference settings-language">
            <div className="settings-preference-copy">
              <label htmlFor="app-language">{t('Language')}</label>
              <p id="app-language-help">{t('Choose your preferred app language.')}</p>
            </div>
            <select
              id="app-language"
              value={locale}
              onChange={(event) => setLocale(event.target.value === 'fa' ? 'fa' : 'en')}
              aria-describedby="app-language-help"
            >
              <option value="en">English</option>
              <option value="fa">فارسی</option>
            </select>
          </div>
          <div className="settings-preference">
            <div className="settings-preference-copy">
              <strong>{t('Community feed')}</strong>
              <p>{t('Share automatically generated weight progress events with the Healthy community. Photos stay private.')}</p>
            </div>
            <button
              type="button"
              className="button button-ghost settings-switch"
              role="switch"
              aria-checked={feedOptIn}
              aria-busy={busyAction === 'feed'}
              disabled={Boolean(busyAction) || !user}
              onClick={() => void handleFeedPreference()}
            >
              {busyAction === 'feed' ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : null}
              {t(feedOptIn ? 'Sharing on' : 'Sharing off')}
            </button>
          </div>
          <div className="settings-actions">
            <button className="button button-ghost" type="button" onClick={() => void handleRefresh()} disabled={Boolean(busyAction)} aria-busy={busyAction === 'refresh'}>
              {busyAction === 'refresh' ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <RefreshCw size={17} aria-hidden="true" />}
              {t(busyAction === 'refresh' ? 'Refreshing…' : 'Refresh cloud data')}
            </button>
            <button className="button button-ghost danger-button" type="button" onClick={() => void handleLogout()} disabled={Boolean(busyAction)} aria-busy={busyAction === 'logout'}>
              {busyAction === 'logout' ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <LogOut size={17} aria-hidden="true" />}
              {t(busyAction === 'logout' ? 'Logging out…' : 'Log out')}
            </button>
            {feedback ? <p className={feedback.type === 'error' ? 'error-text' : 'success-text'} role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite">{feedback.type === 'error' ? translateError(locale, feedback.text) : t(feedback.text)}</p> : null}
          </div>
        </section>
      </div>
      <style jsx>{`
        .settings-preference-copy { display: grid; gap: 5px; }
        .settings-preference-copy label { font-size: 14px; font-weight: 600; cursor: pointer; }
        .settings-preference-copy p { max-width: 460px; margin: 0; color: var(--ink-soft); font-size: 12px; line-height: 1.65; }
        .settings-language select { min-width: 160px; min-height: 44px; padding: 9px 12px; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); background: var(--surface-2); color: var(--ink); font-size: 14px; cursor: pointer; }
        .settings-switch { min-width: 126px; flex: 0 0 auto; }
        .settings-actions p { flex-basis: 100%; margin: 2px 0 0; }
        @media (max-width: 560px) {
          .settings-preference { align-items: flex-start !important; flex-direction: column; }
          .settings-language select { width: 100%; }
        }
      `}</style>
    </AppShell>
  );
}
