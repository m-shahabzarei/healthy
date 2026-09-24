/* eslint-disable @next/next/no-img-element -- preview is a browser-generated data URL. */
'use client';

import { Camera, Check, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { useState } from 'react';
import { addHostedPhoto } from '@/lib/hosted-store';
import { toDateKey } from '@/lib/selectors';
import type { ProgressPhoto } from '@/lib/types';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { translateError } from '@/lib/i18n';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type CompressedImage = {
  preview: string;
  blob: Blob;
};

function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const ratio = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext('2d');
        if (!context) {
          resolve({ preview: source, blob: file });
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not prepare the selected image.'));
            return;
          }
          resolve({ preview: canvas.toDataURL('image/jpeg', 0.78), blob });
        }, 'image/jpeg', 0.78);
      };
      image.onerror = () => reject(new Error('The selected file is not a readable image.'));
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoUploadForm({ onSaved }: { onSaved?: (photo: ProgressPhoto) => void }) {
  const { locale, t } = useLanguage();
  const [fileName, setFileName] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [date, setDate] = useState('');
  const [caption, setCaption] = useState('');
  const [shareToFeed, setShareToFeed] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [busy, setBusy] = useState(false);

  function clearFile() {
    setPreview('');
    setPhotoBlob(null);
    setFileName('');
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError('');
    setSaved(false);
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Choose a JPG, PNG, or WebP image. SVG files are not supported.');
      clearFile();
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Choose an image smaller than 4 MB.');
      clearFile();
      return;
    }

    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.blob.size > MAX_BYTES) throw new Error('The prepared image is still larger than 4 MB.');
      setPreview(compressed.preview);
      setPhotoBlob(compressed.blob);
      setFileName(file.name);
    } catch (fileError) {
      clearFile();
      setError(fileError instanceof Error ? fileError.message : 'Could not read the image. Try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!photoBlob || !preview) {
      setError('Choose a photo first.');
      return;
    }

    setBusy(true);
    try {
      const photo = await addHostedPhoto(
        photoBlob,
        {
          date: date || toDateKey(new Date()),
          caption: caption.trim() || undefined,
          visibility: shareToFeed ? 'feed' : 'private',
        },
        fileName,
      );
      setSaved(true);
      onSaved?.(photo);
      clearFile();
      setCaption('');
      setDate('');
      setShareToFeed(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not upload the photo. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const unavailable = busy || processing;

  return (
    <section className="photo-upload surface-muted">
      <div className="section-heading">
        <div><h2>{t('Monthly photo')}</h2><p>{t('Same spot. Once a month.')}</p></div>
        <Camera size={19} className="muted-icon" aria-hidden="true" />
      </div>
      <form onSubmit={submit} className="photo-form" aria-busy={unavailable}>
        <label className={`photo-dropzone ${preview ? 'has-preview' : ''}`} htmlFor="progress-photo">
          {preview ? (
            <>
              <img src={preview} alt={t('Preview of the selected progress photo')} />
              <span
                className="photo-remove"
                role="button"
                tabIndex={unavailable ? -1 : 0}
                aria-disabled={unavailable}
                onClick={(event) => { event.preventDefault(); if (!unavailable) clearFile(); }}
                onKeyDown={(event) => {
                  if (!unavailable && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    clearFile();
                  }
                }}
                aria-label={t('Remove photo')}
              >
                <X size={16} aria-hidden="true" />
              </span>
            </>
          ) : processing ? (
            <><LoaderCircle size={25} className="spin" aria-hidden="true" /><strong>{t('Preparing photo…')}</strong></>
          ) : (
            <><ImagePlus size={25} aria-hidden="true" /><strong>{t('Tap to choose a photo')}</strong><span>{t('JPG, PNG, or WebP, up to 4 MB')}</span></>
          )}
          <input id="progress-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} disabled={unavailable} />
        </label>
        {fileName && <p className="selected-file">{fileName}</p>}
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="photo-date">{t('Photo date')} <span className="optional-label">{t('optional')}</span></label>
            <input id="photo-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} />
          </div>
          <div className="form-field">
            <label htmlFor="photo-caption">{t('Short note')} <span className="optional-label">{t('optional')}</span></label>
            <input id="photo-caption" type="text" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder={t('e.g. Month one')} maxLength={80} disabled={busy} />
          </div>
        </div>
        <label className="share-toggle">
          <input type="checkbox" checked={shareToFeed} onChange={(event) => setShareToFeed(event.target.checked)} disabled={busy} />
          <span className="check-box" aria-hidden="true" />
          <span><strong>{t('Show this photo in the Healthy feed')}</strong><small>{t('It stays private by default. You choose when to share.')}</small></span>
        </label>
        {error && <p className="error-text" role="alert">{translateError(locale, error)}</p>}
        {saved && <p className="success-text" role="status" aria-live="polite"><Check size={15} aria-hidden="true" /> {t('Photo uploaded to your journey.')}</p>}
        <button type="submit" className="button button-primary" disabled={unavailable} aria-busy={busy}>
          {busy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : <Camera size={17} aria-hidden="true" />}
          {t(busy ? 'Uploading…' : processing ? 'Preparing…' : 'Save photo')}
        </button>
      </form>
    </section>
  );
}
