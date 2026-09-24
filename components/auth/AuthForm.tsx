'use client';

import { useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginHosted, registerHosted } from '@/lib/hosted-store';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { normalizeLocalizedNumber, translateError } from '@/lib/i18n';

type AuthFormProps = { mode: 'login' | 'register' };

export function AuthForm({ mode }: AuthFormProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const isLogin = mode === 'login';
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) {
      setFeedback({ type: 'error', text: t('Use 3–32 lowercase letters, numbers, dots, dashes, or underscores.') });
      return;
    }
    if (password.length < 8) {
      setFeedback({ type: 'error', text: t('Your password needs at least 8 characters.') });
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setFeedback({ type: 'error', text: t('The passwords do not match.') });
      return;
    }
    const parsedStart = Number(normalizeLocalizedNumber(startWeight));
    const parsedGoal = Number(normalizeLocalizedNumber(goalWeight));
    if (!isLogin && (!Number.isFinite(parsedStart) || parsedStart < 20 || parsedStart > 400 || !Number.isFinite(parsedGoal) || parsedGoal < 20 || parsedGoal >= parsedStart)) {
      setFeedback({ type: 'error', text: t('Enter valid starting and goal weights; your goal should be lower than your start.') });
      return;
    }

    setBusy(true);
    try {
      if (isLogin) {
        await loginHosted(normalizedUsername, password);
      } else {
        await registerHosted({
          username: normalizedUsername,
          password,
          displayName: displayName.trim() || normalizedUsername,
          startWeight: parsedStart,
          goalWeight: parsedGoal,
        });
      }
      setFeedback({ type: 'success', text: t(isLogin ? 'You’re in. Opening your journey…' : 'Your account is ready. Let’s go.') });
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: t(error instanceof Error ? error.message : 'Authentication failed. Please try again.'),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {!isLogin && (
        <div className="form-field">
          <label htmlFor="displayName">{t('Display name')}</label>
          <input id="displayName" name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder={t('e.g. Alex')} />
        </div>
      )}
      {!isLogin && <div className="form-grid auth-weight-grid"><div className="form-field"><label htmlFor="startWeight">{t('Starting weight')} <span className="field-unit">{t('kg')}</span></label><input id="startWeight" name="startWeight" inputMode="decimal" value={startWeight} onChange={(event) => setStartWeight(event.target.value)} placeholder={t('e.g. 90')} required /></div><div className="form-field"><label htmlFor="goalWeight">{t('Goal weight')} <span className="field-unit">{t('kg')}</span></label><input id="goalWeight" name="goalWeight" inputMode="decimal" value={goalWeight} onChange={(event) => setGoalWeight(event.target.value)} placeholder={t('e.g. 80')} required /></div></div>}
      <div className="form-field">
        <label htmlFor="username">{t('Username')}</label>
        <input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" placeholder={t('e.g. alex')} required />
      </div>
      <div className="form-field">
        <label htmlFor="password">{t('Password')}</label>
        <div className="password-wrap">
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder={t('At least 8 characters')} minLength={8} required />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={t(showPassword ? 'Hide password' : 'Show password')}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
      </div>
      {!isLogin && (
        <div className="form-field">
          <label htmlFor="confirmPassword">{t('Confirm password')}</label>
          <input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder={t('One more time')} required />
        </div>
      )}
      {feedback && <div className={`${feedback.type}-text auth-feedback`} role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite">{feedback.type === 'error' ? translateError(locale, feedback.text) : t(feedback.text)}</div>}
      <button type="submit" className="button button-primary auth-submit" disabled={busy} aria-busy={busy}>
        {busy ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : isLogin ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
        {t(busy ? 'One moment…' : isLogin ? 'Log in to Healthy' : 'Create account')}
      </button>
      <p className="auth-privacy"><ShieldCheck size={15} aria-hidden="true" /> {t('Your progress stays private unless you choose to share it.')}</p>
    </form>
  );
}
