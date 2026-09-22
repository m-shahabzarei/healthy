'use client';

import Link from 'next/link';
import { LogOut, Settings2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, logout, subscribe } from '@/lib/store';
import { BottomNav } from './BottomNav';

type AppShellProps = { children: React.ReactNode; active: 'home' | 'progress' | 'community' };

export function AppShell({ children, active }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = snapshot.currentUser;
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (hasHydrated && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hasHydrated, pathname, router, user]);

  if (!user) {
    return <main className="app-loading" aria-live="polite"><span className="loading-mark" />Preparing your space…</main>;
  }

  function handleLogout() {
    logout();
    router.replace('/login');
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
          <button type="button" className="side-action side-logout" onClick={handleLogout}><LogOut size={17} aria-hidden="true" /> Log out</button>
        </div>
      </aside>
      <div className="app-main">
        <header className="mobile-app-header">
          <Link href="/dashboard" className="brand-mark" aria-label="Healthy home"><span className="brand-dot" aria-hidden="true" />Healthy</Link>
          <button type="button" className="mobile-avatar" onClick={handleLogout} aria-label="Log out">{user.initials || user.displayName.slice(0, 1)}</button>
        </header>
        <main className="app-content">{children}</main>
        <div className="mobile-nav-wrap"><BottomNav active={active} /></div>
      </div>
    </div>
  );
}
