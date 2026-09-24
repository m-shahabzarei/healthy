import { useId } from "react";
import type { CSSProperties } from "react";
import type { WeightEntry } from "../../lib/types";
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { formatDate as localizedDate, formatNumber, type Locale } from '@/lib/i18n';

export type { WeightEntry } from "../../lib/types";

export interface WeightChartProps {
  entries: WeightEntry[];
  /** Optional accessible label for the chart region. */
  ariaLabel?: string;
  /** Optional class name for consumers that need layout overrides. */
  className?: string;
  /** Unit shown in labels and the data table. Defaults to kilograms. */
  unit?: string;
}

interface ChartPoint {
  entry: WeightEntry;
  timestamp: number;
  value: number;
  label: string;
  x: number;
  y: number;
}

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 280;
const PLOT = {
  top: 24,
  right: 24,
  bottom: 44,
  left: 48,
};

const visuallyHidden: CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
};

const normalizeEntries = (entries: WeightEntry[], locale: Locale): ChartPoint[] =>
  entries
    .map((entry, index) => ({
      entry,
      index,
      timestamp: Date.parse(entry.date),
      value: Number(entry.weight),
    }))
    .filter(
      ({ timestamp, value }) =>
        Number.isFinite(timestamp) && Number.isFinite(value),
    )
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
    .map(({ entry, timestamp, value }) => ({
      entry,
      timestamp,
      value,
      label: localizedDate(locale, entry.date, { day: 'numeric', month: 'short' }),
      x: 0,
      y: 0,
    }));

const makeSummary = (points: ChartPoint[], unit: string, locale: Locale, t: (key: string, values?: Record<string, string | number>) => string) => {
  if (points.length === 0) {
    return t('There is not enough data to show a weight trend yet.');
  }

  const first = points[0];
  const last = points[points.length - 1];
  const min = points.reduce((lowest, point) =>
    point.value < lowest.value ? point : lowest,
  );
  const max = points.reduce((highest, point) =>
    point.value > highest.value ? point : highest,
  );
  const delta = last.value - first.value;
  const weight = (value: number) => formatNumber(locale, value, { maximumFractionDigits: 1 });
  const absoluteDelta = weight(Math.abs(delta));
  const change =
    Math.abs(delta) < 0.05
      ? t('no meaningful change')
      : delta < 0
        ? t('{value} {unit} down', { value: absoluteDelta, unit: t(unit) })
        : t('{value} {unit} up', { value: absoluteDelta, unit: t(unit) });

  if (points.length === 1) {
    return t('One weight check-in on {date}: {value} {unit}.', { date: first.label, value: weight(first.value), unit: t(unit) });
  }

  return t('From {first} to {last}, weight moved from {start} to {end} {unit}; {change}. The low was {min} and the high was {max} {unit}.', { first: first.label, last: last.label, start: weight(first.value), end: weight(last.value), unit: t(unit), change, min: weight(min.value), max: weight(max.value) });
};

/**
 * Responsive, SVG-based weight trend chart with a screen-reader-friendly
 * summary and a visually hidden tabular fallback.
 */
export function WeightChart({
  entries,
  ariaLabel = "Weight trend",
  className,
  unit = "kg",
}: WeightChartProps) {
  const { locale, t } = useLanguage();
  const formatWeight = (value: number) => formatNumber(locale, value, { maximumFractionDigits: 1 });
  const id = useId().replace(/:/g, "");
  const summaryId = `weight-chart-summary-${id}`;
  const tableId = `weight-chart-table-${id}`;
  const points = normalizeEntries(entries, locale);
  const summary = makeSummary(points, unit, locale, t);

  const plotWidth = VIEWBOX_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = VIEWBOX_HEIGHT - PLOT.top - PLOT.bottom;
  const values = points.map((point) => point.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  // Keep a little breathing room around the line, including when every
  // reading is identical.
  const valuePadding = Math.max((maxValue - minValue) * 0.18, 0.5);
  const axisMin = minValue - valuePadding;
  const axisMax = maxValue + valuePadding;
  const axisRange = axisMax - axisMin || 1;

  const positionedPoints = points.map((point, index) => ({
    ...point,
    x:
      points.length === 1
        ? PLOT.left + plotWidth / 2
        : PLOT.left + (index / (points.length - 1)) * plotWidth,
    y: PLOT.top + ((axisMax - point.value) / axisRange) * plotHeight,
  }));
  const polyline = positionedPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath =
    positionedPoints.length > 1
      ? `M ${positionedPoints[0].x} ${VIEWBOX_HEIGHT - PLOT.bottom} L ${positionedPoints
          .map((point) => `${point.x} ${point.y}`)
          .join(" L ")} L ${positionedPoints[positionedPoints.length - 1].x} ${
          VIEWBOX_HEIGHT - PLOT.bottom
        } Z`
      : "";
  const chartClassName = ["weight-chart", className].filter(Boolean).join(" ");
  const gridLines = [0, 0.5, 1].map((ratio) => ({
    y: PLOT.top + ratio * plotHeight,
    value: axisMax - ratio * axisRange,
  }));

  return (
    <figure
      className={chartClassName}
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
      aria-label={t(ariaLabel)}
      aria-describedby={summaryId}
      style={{ margin: 0, minWidth: 0 }}
    >
      <figcaption
        id={summaryId}
        aria-live="polite"
        style={{
          color: "var(--ink-soft, #c5c5c5)",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          marginBottom: "0.75rem",
        }}
      >
        {summary}
      </figcaption>

      {points.length === 0 ? (
        <div
          role="status"
          style={{
            border: "1px dashed var(--line, #333333)",
            color: "var(--ink-soft, #c5c5c5)",
            minHeight: 160,
            padding: "2rem 1rem",
            textAlign: "center",
          }}
        >
          {t('Log your first daily weight to start seeing a trend.')}
        </div>
      ) : (
        <svg
          aria-hidden="true"
          focusable="false"
          role="presentation"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          width="100%"
          style={{ display: "block", height: "auto", overflow: "visible" }}
        >
          <g stroke="var(--line, #333333)" strokeWidth="1" vectorEffect="non-scaling-stroke">
            {gridLines.map((line) => (
              <line
                key={`grid-${line.y}`}
                x1={PLOT.left}
                x2={VIEWBOX_WIDTH - PLOT.right}
                y1={line.y}
                y2={line.y}
              />
            ))}
          </g>

          <g
            fill="var(--ink-soft, #c5c5c5)"
            fontFamily="inherit"
            fontSize="12"
            textAnchor="end"
          >
            {gridLines.map((line) => (
              <text key={`label-${line.y}`} x={PLOT.left - 10} y={line.y + 4}>
                {formatWeight(line.value)}
              </text>
            ))}
          </g>

          {areaPath ? (
            <path
              d={areaPath}
              fill="var(--accent, #f7f7f7)"
              opacity="0.12"
              stroke="none"
            />
          ) : null}
          {polyline ? (
            <polyline
              fill="none"
              points={polyline}
              stroke="var(--accent, #f7f7f7)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {positionedPoints.map((point, index) => (
            <g
              key={`${point.entry.id ?? "entry"}-${point.entry.date}-${index}`}
            >
              <title>
                {point.label}: {formatWeight(point.value)} {t(unit)}
              </title>
              <circle
                cx={point.x}
                cy={point.y}
                fill="var(--canvas, #080808)"
                r="5"
                stroke="var(--accent, #f7f7f7)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          <g
            fill="var(--ink-soft, #c5c5c5)"
            fontFamily="inherit"
            fontSize="12"
          >
            <text x={PLOT.left} y={VIEWBOX_HEIGHT - 12} textAnchor="start">
              {positionedPoints[0]?.label}
            </text>
            {positionedPoints.length > 1 ? (
              <text
                x={VIEWBOX_WIDTH - PLOT.right}
                y={VIEWBOX_HEIGHT - 12}
                textAnchor="end"
              >
                {positionedPoints[positionedPoints.length - 1]?.label}
              </text>
            ) : null}
          </g>
        </svg>
      )}

      <table id={tableId} style={visuallyHidden}>
        <caption>{t('{label} data table', { label: t(ariaLabel) })}</caption>
        <thead>
          <tr>
            <th scope="col">{t('Date')}</th>
            <th scope="col">{t('Weight ({unit})', { unit: t(unit) })}</th>
            <th scope="col">{t('Note')}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point, index) => (
            <tr
              key={`${point.entry.id ?? "entry"}-${point.entry.date}-${index}`}
            >
              <td>
                <time dateTime={point.entry.date}>{point.label}</time>
              </td>
              <td>{formatWeight(point.value)}</td>
              <td>{point.entry.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default WeightChart;
