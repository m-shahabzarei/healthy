'use client';

import { useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginHosted, registerHosted } from '@/lib/hosted-store';

type AuthFormProps = { mode: 'login' | 'register' };

export function AuthForm({ mode }: AuthFormProps) {
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
      setFeedback({ type: 'error', text: 'Use 3–32 lowercase letters, numbers, dots, dashes, or underscores.' });
      return;
    }
    if (password.length < 8) {
      setFeedback({ type: 'error', text: 'Your password needs at least 8 characters.' });
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setFeedback({ type: 'error', text: 'The passwords do not match.' });
      return;
    }
    const normalizeDigits = (value: string) => value.replace(',', '.').trim();
    const parsedStart = Number(normalizeDigits(startWeight));
    const parsedGoal = Number(normalizeDigits(goalWeight));
    if (!isLogin && (!Number.isFinite(parsedStart) || parsedStart < 20 || parsedStart > 400 || !Number.isFinite(parsedGoal) || parsedGoal < 20 || parsedGoal >= parsedStart)) {
      setFeedback({ type: 'error', text: 'Enter valid starting and goal weights; your goal should be lower than your start.' });
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
      setFeedback({ type: 'success', text: isLogin ? 'You’re in. Opening your journey…' : 'Your account is ready. Let’s go.' });
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Authentication failed. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {!isLogin && (
        <div className="form-field">
          <label htmlFor="displayName">Display name</label>
          <input id="displayName" name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder="e.g. Alex" />
        </div>
      )}
      {!isLogin && <div className="form-grid auth-weight-grid"><div className="form-field"><label htmlFor="startWeight">Starting weight <span className="field-unit">kg</span></label><input id="startWeight" name="startWeight" inputMode="decimal" value={startWeight} onChange={(event) => setStartWeight(event.target.value)} placeholder="e.g. 90" required /></div><div className="form-field"><label htmlFor="goalWeight">Goal weight <span className="field-unit">kg</span></label><input id="goalWeight" name="goalWeight" inputMode="decimal" value={goalWeight} onChange={(event) => setGoalWeight(event.target.value)} placeholder="e.g. 80" required /></div></div>}
      <div className="form-field">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" placeholder="e.g. alex" required />
      </div>
      <div className="form-field">
        <label htmlFor="password">Password</label>
        <div className="password-wrap">
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="At least 8 characters" minLength={8} required />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
      </div>
      {!isLogin && (
        <div className="form-field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="One more time" required />
        </div>
      )}
      {feedback && <div className={`${feedback.type}-text auth-feedback`} role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite">{feedback.text}</div>}
      <button type="submit" className="button button-primary auth-submit" disabled={busy} aria-busy={busy}>
        {busy ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : isLogin ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
        {busy ? 'One moment…' : isLogin ? 'Log in to Healthy' : 'Create account'}
      </button>
      <p className="auth-privacy"><ShieldCheck size={15} aria-hidden="true" /> Your progress stays private unless you choose to share it.</p>
    </form>
  );
}
