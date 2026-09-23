'use client';

import { Check, LoaderCircle, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addHostedWeight } from '@/lib/hosted-store';
import { toDateKey } from '@/lib/selectors';
import type { WeightEntry } from '@/lib/types';

function todayKey() { return toDateKey(new Date()); }
function normalizeDigits(value: string) {
  return value.replace(',', '.').trim();
}

export function WeightEntryForm({ onSaved }: { onSaved?: (entry: WeightEntry) => void }) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDate(todayKey()); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setSaved(false);
    const parsed = Number(normalizeDigits(weight));
    if (!Number.isFinite(parsed) || parsed < 20 || parsed > 400) { setError('Enter a weight between 20 and 400 kg.'); return; }
    setBusy(true);
    try {
      const entry = await addHostedWeight({ weightKg: parsed, date, note: note.trim() || undefined });
      setWeight(''); setNote(''); setSaved(true); onSaved?.(entry);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this entry. Check the date and weight.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="entry-card surface-muted" dir="ltr">
      <div className="section-heading"><div><h2>Today&apos;s check-in</h2><p>One number. That&apos;s it.</p></div><span className="entry-icon"><Plus size={18} aria-hidden="true" /></span></div>
      <form className="entry-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="weight">Weight <span className="field-unit">kg</span></label><div className="input-suffix-wrap"><input id="weight" name="weight" inputMode="decimal" type="text" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="e.g. 88.8" required /><span>kg</span></div></div>
          <div className="form-field"><label htmlFor="weight-date">Date</label><input id="weight-date" name="weight-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div>
        </div>
        <div className="form-field"><label htmlFor="weight-note">Note <span className="optional-label">optional</span></label><input id="weight-note" name="weight-note" type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Slept well, more energy…" maxLength={120} /></div>
        {error && <p className="error-text" role="alert">{error}</p>}
        {saved && <p className="success-text" role="status" aria-live="polite"><Check size={15} aria-hidden="true" /> Saved. Your trend is up to date.</p>}
        <button className="button button-primary entry-submit" type="submit" disabled={busy} aria-busy={busy}>{busy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />} {busy ? 'Saving…' : 'Log weight'}</button>
      </form>
    </section>
  );
}
