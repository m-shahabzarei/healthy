'use client';

import { useRouter } from 'next/navigation';
import { LogOut, RotateCcw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { logout, resetStore } from '@/lib/store';

export default function SettingsPage() {
  const router = useRouter();
  return <AppShell active="home"><div className="app-container settings-page"><p className="eyebrow"><span className="eyebrow-line" /> Preferences</p><h1 className="page-title">Settings.</h1><p className="page-subtitle">Simple controls for this personal version.</p><section className="settings-list surface"><div><strong>Measurement unit</strong><span>Kilograms (kg)</span></div><div><strong>Feed privacy</strong><span>Your progress events use your display name.</span></div><div className="settings-actions"><button className="button button-ghost" type="button" onClick={() => { resetStore(); router.push('/dashboard'); }}><RotateCcw size={17} /> Reset demo data</button><button className="button button-ghost danger-button" type="button" onClick={() => { logout(); router.replace('/login'); }}><LogOut size={17} /> Log out</button></div></section></div></AppShell>;
}
