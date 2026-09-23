import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

type AuthCardProps = {
  mode: 'login' | 'register';
  children: React.ReactNode;
};

export function AuthCard({ mode, children }: AuthCardProps) {
  const isLogin = mode === 'login';

  return (
    <main className="auth-page">
      <div className="auth-grid page-gutter">
        <section className="auth-panel surface" aria-label={isLogin ? 'Login form' : 'Registration form'}>
          <div className="auth-panel-head">
            <div>
              <span className="mono-label">{isLogin ? 'WELCOME BACK' : 'MAKE IT YOURS'}</span>
              <h2>{isLogin ? 'Welcome back.' : 'Let’s begin.'}</h2>
            </div>
            <ShieldCheck size={20} aria-label="Secure hosted account" className="auth-shield" />
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
