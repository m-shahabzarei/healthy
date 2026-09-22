/* eslint-disable @next/next/no-img-element -- preview is a browser-generated data URL. */
'use client';

import { Camera, Check, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { useState } from 'react';
import { addProgressPhoto } from '@/lib/store';
import type { ProgressPhoto } from '@/lib/types';

const MAX_BYTES = 4 * 1024 * 1024;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const ratio = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext('2d');
        if (!context) { resolve(source); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .78));
      };
      image.onerror = () => reject(new Error('image'));
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoUploadForm({ onSaved }: { onSaved?: (photo: ProgressPhoto) => void }) {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState('');
  const [date, setDate] = useState('');
  const [caption, setCaption] = useState('');
  const [shareToFeed, setShareToFeed] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function clearFile() { setPreview(''); setFileName(''); }
  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; setError(''); setSaved(false); if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); clearFile(); return; }
    if (file.size > MAX_BYTES) { setError('Choose an image smaller than 4 MB.'); clearFile(); return; }
    try { setPreview(await compressImage(file)); setFileName(file.name); } catch { setError('Could not read the image. Try again.'); }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSaved(false); if (!preview) { setError('Choose a photo first.'); return; }
    setBusy(true);
    window.setTimeout(() => {
      const photo = addProgressPhoto({ dataUrl: preview, date: date || undefined, caption, visibility: shareToFeed ? 'feed' : 'private' }); setBusy(false);
      if (!photo) { setError('Could not save the photo. Your browser storage may be full.'); return; }
      setSaved(true); onSaved?.(photo); clearFile(); setCaption(''); setDate(''); setShareToFeed(false);
    }, 220);
  }

  return <section className="photo-upload surface-muted" dir="ltr"><div className="section-heading"><div><h2>Monthly photo</h2><p>Same spot. Once a month.</p></div><Camera size={19} className="muted-icon" aria-hidden="true" /></div><form onSubmit={submit} className="photo-form"><label className={`photo-dropzone ${preview ? 'has-preview' : ''}`} htmlFor="progress-photo">{preview ? <><img src={preview} alt="Preview of the selected progress photo" /><span className="photo-remove" role="button" tabIndex={0} onClick={(event) => { event.preventDefault(); clearFile(); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); clearFile(); } }} aria-label="Remove photo"><X size={16} /></span></> : <><ImagePlus size={25} aria-hidden="true" /><strong>Tap to choose a photo</strong><span>JPG or PNG, up to 4 MB</span></>}<input id="progress-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} /></label>{fileName && <p className="selected-file">{fileName}</p>}<div className="form-grid"><div className="form-field"><label htmlFor="photo-date">Photo date <span className="optional-label">optional</span></label><input id="photo-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="form-field"><label htmlFor="photo-caption">Short note <span className="optional-label">optional</span></label><input id="photo-caption" type="text" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="e.g. Month one" maxLength={80} /></div></div><label className="share-toggle"><input type="checkbox" checked={shareToFeed} onChange={(event) => setShareToFeed(event.target.checked)} /><span className="check-box" aria-hidden="true" /><span><strong>Show this photo in the Healthy feed</strong><small>It stays private by default. You choose when to share.</small></span></label>{error && <p className="error-text" role="alert">{error}</p>}{saved && <p className="success-text" role="status"><Check size={15} /> Photo added to your journey.</p>}<button type="submit" className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <Camera size={17} />} {busy ? 'Saving…' : 'Save photo'}</button></form></section>;
}
