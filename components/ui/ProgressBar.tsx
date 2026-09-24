import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatNumber } from '@/lib/i18n';

type ProgressBarProps = { value: number; label?: string };

export function ProgressBar({ value, label = 'Goal progress' }: ProgressBarProps) {
  const { locale, t } = useLanguage();
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-wrap">
      <div className="progress-meta"><span>{t(label)}</span><strong>{formatNumber(locale, safeValue, { maximumFractionDigits: 0 })}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}>
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
