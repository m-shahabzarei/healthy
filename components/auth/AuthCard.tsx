import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';

type AuthCardProps = {
  mode: 'login' | 'register';
  children: React.ReactNode;
};

export function AuthCard({ mode, children }: AuthCardProps) {
  const isLogin = mode === 'login';

  return (
    <main className="auth-page">
      <div className="auth-grid page-gutter">
        <section className="auth-intro" aria-labelledby="auth-title">
          <Link href="/" className="brand-mark" aria-label="Healthy home"><span className="brand-dot" aria-hidden="true" />Healthy</Link>
          <div className="auth-intro-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> A quiet place to keep going</p>
            <h1 id="auth-title">You don&apos;t<br />have to be <em>perfect.</em></h1>
            <p>Just show up for today. Tomorrow builds on the small things you record now.</p>
          </div>
          <div className="auth-promise"><Check size={16} aria-hidden="true" /><span>No noise. No pressure to compare.</span></div>
        </section>
        <section className="auth-panel surface" aria-label={isLogin ? 'Login form' : 'Registration form'}>
          <div className="auth-panel-head">
            <div>
              <span className="mono-label">{isLogin ? 'WELCOME BACK' : 'MAKE IT YOURS'}</span>
              <h2>{isLogin ? 'Welcome back.' : 'Let’s begin.'}</h2>
            </div>
            <ShieldCheck size={20} aria-label="Local storage" className="auth-shield" />
          </div>
          <p className="auth-panel-note">{isLogin ? 'Sign in to see your journey.' : 'Create a space for your own pace.'}</p>
          {children}
          <div className="auth-switch">
            <span>{isLogin ? 'New here?' : 'Already have an account?'}</span>
            <Link href={isLogin ? '/register' : '/login'}>{isLogin ? 'Create one' : 'Log in'} <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
