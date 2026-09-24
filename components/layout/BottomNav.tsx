'use client';

import Link from 'next/link';
import { Activity, Home, UserRound, Users } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type NavKey = 'home' | 'progress' | 'community' | 'profile';

const items: { key: NavKey; href: string; label: string; icon: typeof Home }[] = [
  { key: 'home', href: '/dashboard', label: 'Today', icon: Home },
  { key: 'progress', href: '/progress', label: 'Progress', icon: Activity },
  { key: 'community', href: '/community', label: 'Community', icon: Users },
  { key: 'profile', href: '/profile', label: 'Profile', icon: UserRound },
];

export function BottomNav({ active }: { active: NavKey }) {
  const { t } = useLanguage();
  return (
    <nav className="bottom-nav" aria-label={t('Main navigation')}>
      {items.map(({ key, href, label, icon: Icon }) => (
        <Link key={key} href={href} className={`nav-item ${active === key ? 'active' : ''}`} aria-current={active === key ? 'page' : undefined}>
          <Icon size={19} strokeWidth={active === key ? 2.5 : 1.7} aria-hidden="true" />
          <span>{t(label)}</span>
        </Link>
      ))}
    </nav>
  );
}
