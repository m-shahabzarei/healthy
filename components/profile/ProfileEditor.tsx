'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import type { User } from '@/lib/types';
import { isDateKey } from '@/lib/selectors';
import { updateHostedProfile } from '@/lib/hosted-store';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { normalizeLocalizedNumber, translateError } from '@/lib/i18n';

type Draft = {
  displayName: string;
  startWeight: string;
  targetWeight: string;
  startDate: string;
  targetDate: string;
};
type Field = keyof Draft;
type Errors = Partial<Record<Field, string>>;

function fromUser(user: User): Draft {
  return {
    displayName: user.displayName,
    startWeight: user.goal.startWeightKg > 0 ? String(user.goal.startWeightKg) : '',
    targetWeight: user.goal.targetWeightKg > 0 ? String(user.goal.targetWeightKg) : '',
    startDate: user.goal.startDate,
    targetDate: user.goal.targetDate ?? '',
  };
}

function parseWeight(value: string): number {
  return Number(normalizeLocalizedNumber(value));
}

function sameDraft(a: Draft, b: Draft): boolean {
  return (Object.keys(a) as Field[]).every((field) => a[field] === b[field]);
}

function validate(draft: Draft): Errors {
  const errors: Errors = {};
  const name = draft.displayName.trim();
  const start = parseWeight(draft.startWeight);
  const target = parseWeight(draft.targetWeight);
  if (!name || name.length > 50) errors.displayName = 'Enter a name between 1 and 50 characters.';
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizeLocalizedNumber(draft.startWeight)) || !Number.isFinite(start) || start < 20 || start > 400) {
    errors.startWeight = 'Enter a starting weight from 20 to 400 kg, with up to 2 decimals.';
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizeLocalizedNumber(draft.targetWeight)) || !Number.isFinite(target) || target < 20 || target > 400) {
    errors.targetWeight = 'Enter a goal weight from 20 to 400 kg, with up to 2 decimals.';
  } else if (!errors.startWeight && target >= start) {
    errors.targetWeight = 'Your goal weight must be lower than your starting weight.';
  }
  if (!isDateKey(draft.startDate)) errors.startDate = 'Choose a valid start date.';
  if (draft.targetDate && (!isDateKey(draft.targetDate) || (isDateKey(draft.startDate) && draft.targetDate < draft.startDate))) {
    errors.targetDate = 'Choose a target date on or after your start date.';
  }
  return errors;
}

export function ProfileEditor({ user }: { user: User }) {
  const { locale, t } = useLanguage();
  const [draft, setDraft] = useState<Draft>(() => fromUser(user));
  const savedRef = useRef<Draft>(fromUser(user));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dirty = !sameDraft(draft, savedRef.current);

  useEffect(() => {
    const next = fromUser(user);
    setDraft((current) => sameDraft(current, savedRef.current) ? next : current);
    savedRef.current = next;
  }, [user]);

  function change(field: Field, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFeedback(null);
  }

  function reset() {
    setDraft(fromUser(user));
    setErrors({});
    setFeedback(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty) return;
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(`profile-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const updated = await updateHostedProfile({
        displayName: draft.displayName.trim(),
        startWeightKg: parseWeight(draft.startWeight),
        targetWeightKg: parseWeight(draft.targetWeight),
        startDate: draft.startDate,
        targetDate: draft.targetDate || null,
      });
      const next = fromUser(updated);
      savedRef.current = next;
      setDraft(next);
      setFeedback({ type: 'success', text: 'Your profile has been updated.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Could not save your profile. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  function fieldError(field: Field) {
    return errors[field] ? <span id={`profile-${field}-error`} className="error-text" role="alert">{t(errors[field]!)}</span> : null;
  }

  return (
    <section id="profile-details" className="profile-editor surface" aria-labelledby="profile-editor-title">
      <div className="profile-section-head">
        <div><span className="mono-label">{t('ACCOUNT DETAILS')}</span><h2 id="profile-editor-title">{t('Make it yours.')}</h2><p>{t('Update the details that shape your journey.')}</p></div>
      </div>
      <form onSubmit={(event) => void submit(event)} noValidate>
        <div className="profile-form-grid">
          <div className="form-field profile-field-wide">
            <label htmlFor="profile-displayName">{t('Display name')}</label>
            <input id="profile-displayName" value={draft.displayName} onChange={(event) => change('displayName', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, displayName: validate(draft).displayName }))} autoComplete="name" maxLength={50} aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? 'profile-displayName-error' : undefined} disabled={busy} />
            {fieldError('displayName')}
          </div>
          <div className="form-field profile-field-wide">
            <label htmlFor="profile-username">{t('Username')}</label>
            <input id="profile-username" value={`@${user.username}`} readOnly aria-describedby="profile-username-help" />
            <span id="profile-username-help" className="helper-text">{t('Your username is your sign-in identity and cannot be changed.')}</span>
          </div>
          <div className="form-field">
            <label htmlFor="profile-startWeight">{t('Starting weight')} <span className="field-unit">{t('kg')}</span></label>
            <input id="profile-startWeight" value={draft.startWeight} onChange={(event) => change('startWeight', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, startWeight: validate(draft).startWeight }))} inputMode="decimal" autoComplete="off" aria-invalid={Boolean(errors.startWeight)} aria-describedby={errors.startWeight ? 'profile-startWeight-error' : undefined} disabled={busy} />
            {fieldError('startWeight')}
            <span className="helper-text">{t('Changing your starting point will not change past check-ins.')}</span>
          </div>
          <div className="form-field">
            <label htmlFor="profile-targetWeight">{t('Goal weight')} <span className="field-unit">{t('kg')}</span></label>
            <input id="profile-targetWeight" value={draft.targetWeight} onChange={(event) => change('targetWeight', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, targetWeight: validate(draft).targetWeight }))} inputMode="decimal" autoComplete="off" aria-invalid={Boolean(errors.targetWeight)} aria-describedby={errors.targetWeight ? 'profile-targetWeight-error' : undefined} disabled={busy} />
            {fieldError('targetWeight')}
          </div>
          <div className="form-field">
            <label htmlFor="profile-startDate">{t('Start date')}</label>
            <input id="profile-startDate" type="date" value={draft.startDate} onChange={(event) => change('startDate', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, startDate: validate(draft).startDate }))} aria-invalid={Boolean(errors.startDate)} aria-describedby={errors.startDate ? 'profile-startDate-error' : undefined} disabled={busy} />
            {fieldError('startDate')}
          </div>
          <div className="form-field">
            <label htmlFor="profile-targetDate">{t('Target date')} <span className="optional-label">{t('optional')}</span></label>
            <input id="profile-targetDate" type="date" value={draft.targetDate} min={draft.startDate} onChange={(event) => change('targetDate', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, targetDate: validate(draft).targetDate }))} aria-invalid={Boolean(errors.targetDate)} aria-describedby={errors.targetDate ? 'profile-targetDate-error' : undefined} disabled={busy} />
            {fieldError('targetDate')}
          </div>
        </div>
        <div className="profile-form-footer">
          <p>{t('Your progress stays private unless you choose to share activity in Settings.')}</p>
          <div className="profile-form-actions">
            <button type="button" className="button button-ghost" onClick={reset} disabled={!dirty || busy}><RotateCcw size={16} aria-hidden="true" /> {t('Reset')}</button>
            <button type="submit" className="button button-primary" disabled={!dirty || busy} aria-busy={busy}>{busy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : feedback?.type === 'success' ? <Check size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}{t(busy ? 'Saving…' : 'Save changes')}</button>
          </div>
        </div>
        {feedback ? <p className={feedback.type === 'error' ? 'error-text' : 'success-text'} role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite">{feedback.type === 'error' ? translateError(locale, feedback.text) : t(feedback.text)}</p> : null}
      </form>
    </section>
  );
}
