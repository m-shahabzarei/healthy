'use client';

import Link from 'next/link';
import { LoaderCircle, LogOut, RefreshCw, Settings2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getHostedServerState,
  getHostedState,
  logoutHosted,
  refreshHostedData,
  subscribeHosted,
} from '@/lib/hosted-store';
import { BottomNav } from './BottomNav';

type AppShellProps = { children: React.ReactNode; active: 'home' | 'progress' | 'community' };

export function AppShell({ children, active }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hosted = useSyncExternalStore(subscribeHosted, getHostedState, getHostedServerState);
  const user = hosted.snapshot.currentUser;
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (hosted.status === 'anonymous') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hosted.status, pathname, router]);

  if (hosted.status === 'booting' || hosted.status === 'anonymous') {
    return <main className="app-loading" aria-live="polite"><span className="loading-mark" />Preparing your space…</main>;
  }

  async function handleRetry() {
    setRetryBusy(true);
    setActionError('');
    try {
      await refreshHostedData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not reconnect. Please try again.');
    } finally {
      setRetryBusy(false);
    }
  }

  if (hosted.status === 'error' || !user) {
    const message = actionError || hosted.error || 'Healthy could not load your account.';
    return (
      <main className="app-loading">
        <section className="empty-state" aria-live="polite">
          <strong>We could not load your space.</strong>
          <p>{message}</p>
          <button type="button" className="button button-primary" onClick={() => void handleRetry()} disabled={retryBusy} aria-busy={retryBusy}>
            {retryBusy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <RefreshCw size={17} aria-hidden="true" />}
            {retryBusy ? 'Trying again…' : 'Try again'}
          </button>
        </section>
      </main>
    );
  }

  async function handleLogout() {
    setLogoutBusy(true);
    setActionError('');
    try {
      await logoutHosted();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not log out. Please try again.');
      setLogoutBusy(false);
    }
  }

  return (
    <div className="app-page">
      <aside className="desktop-sidebar">
        <Link href="/dashboard" className="brand-mark" aria-label="Healthy home"><span className="brand-dot" aria-hidden="true" />Healthy</Link>
        <div className="sidebar-profile"><span className="avatar avatar-lg">{user.initials || user.displayName.slice(0, 1)}</span><div><strong>{user.displayName}</strong><span>@{user.username}</span></div></div>
        <div className="sidebar-rule" />
        <BottomNav active={active} />
        <div className="sidebar-footer">
          <Link href="/settings" className="side-action"><Settings2 size={17} aria-hidden="true" /> Settings</Link>
          <button type="button" className="side-action side-logout" onClick={() => void handleLogout()} disabled={logoutBusy} aria-busy={logoutBusy}>{logoutBusy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <LogOut size={17} aria-hidden="true" />} {logoutBusy ? 'Logging out…' : 'Log out'}</button>
        </div>
      </aside>
      <div className="app-main">
        <header className="mobile-app-header">
          <Link href="/dashboard" className="brand-mark" aria-label="Healthy home"><span className="brand-dot" aria-hidden="true" />Healthy</Link>
          <button type="button" className="mobile-avatar" onClick={() => void handleLogout()} aria-label="Log out" disabled={logoutBusy} aria-busy={logoutBusy}>{logoutBusy ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : user.initials || user.displayName.slice(0, 1)}</button>
        </header>
        <main className="app-content">
          {actionError ? <p className="error-text" role="alert">{actionError}</p> : null}
          {children}
        </main>
        <div className="mobile-nav-wrap"><BottomNav active={active} /></div>
      </div>
    </div>
  );
}
