'use client';

import Link from 'next/link';
import { Activity, Camera, Home, Users } from 'lucide-react';

type NavKey = 'home' | 'progress' | 'community';

const items: { key: NavKey; href: string; label: string; icon: typeof Home }[] = [
  { key: 'home', href: '/dashboard', label: 'Today', icon: Home },
  { key: 'progress', href: '/progress', label: 'Progress', icon: Activity },
  { key: 'community', href: '/community', label: 'Community', icon: Users },
];

export function BottomNav({ active }: { active: NavKey }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(({ key, href, label, icon: Icon }) => (
        <Link key={key} href={href} className={`nav-item ${active === key ? 'active' : ''}`} aria-current={active === key ? 'page' : undefined}>
          <Icon size={19} strokeWidth={active === key ? 2.5 : 1.7} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
