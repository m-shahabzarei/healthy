'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useLanguage } from '@/components/i18n/LanguageProvider';

type AuthCardProps = {
  mode: 'login' | 'register';
  children: React.ReactNode;
};

export function AuthCard({ mode, children }: AuthCardProps) {
  const isLogin = mode === 'login';
  const { t } = useLanguage();

  return (
    <main className="auth-page">
      <div className="auth-language-bar"><LanguageSwitcher /></div>
      <div className="auth-grid page-gutter">
        <section className="auth-panel surface" aria-label={t(isLogin ? 'Login form' : 'Registration form')}>
          <div className="auth-panel-head">
            <div>
              <span className="mono-label">{t(isLogin ? 'WELCOME BACK' : 'MAKE IT YOURS')}</span>
              <h2>{t(isLogin ? 'Welcome back.' : 'Let’s begin.')}</h2>
            </div>
            <ShieldCheck size={20} aria-label={t('Secure hosted account')} className="auth-shield" />
          </div>
          <p className="auth-panel-note">{t(isLogin ? 'Sign in to see your journey.' : 'Create a space for your own pace.')}</p>
          {children}
          <div className="auth-switch">
            <span>{t(isLogin ? 'New here?' : 'Already have an account?')}</span>
            <Link href={isLogin ? '/register' : '/login'}>{t(isLogin ? 'Create one' : 'Log in')} <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
