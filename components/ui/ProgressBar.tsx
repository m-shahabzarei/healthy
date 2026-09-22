type ProgressBarProps = { value: number; label?: string };

export function ProgressBar({ value, label = 'Goal progress' }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-wrap" dir="ltr">
      <div className="progress-meta"><span>{label}</span><strong>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(safeValue)}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}>
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
