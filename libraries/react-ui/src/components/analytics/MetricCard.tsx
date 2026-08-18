import { cn } from '../../lib/utils';
import { AnalyticsInfoBadge } from './AnalyticsInfoBadge';

export type MetricCardProps = {
  label: string;
  value: number | string;
  deltaPct?: number | null;
  /** Secondary line under the value, e.g. "This period" / "All-time". */
  subtitle?: string;
  /** Shown in a clickable info badge (top-right). */
  info?: string;
  className?: string;
};

const formatDelta = (deltaPct: number | null | undefined) => {
  if (deltaPct == null) return null;
  const rounded = Math.round(deltaPct);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
};

const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const MetricCard = ({
  label,
  value,
  deltaPct,
  subtitle,
  info,
  className,
}: MetricCardProps) => {
  const delta = formatDelta(deltaPct);
  const tone =
    deltaPct == null
      ? 'text-muted-foreground'
      : deltaPct >= 0
        ? 'text-emerald-600'
        : 'text-rose-600';

  return (
    <div
      className={cn(
        // min-w-0 lets grid columns shrink below the intrinsic width of
        // large numbers + deltas; overflow-hidden clips anything left over.
        // Safe for the info badge because its popover renders in a portal.
        'bg-background relative flex min-h-28 min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-4 shadow-sm',
        className,
      )}
    >
      {info ? (
        <div className="absolute right-3 top-3">
          <AnalyticsInfoBadge label={label} info={info} />
        </div>
      ) : null}
      <div
        className={cn(
          'text-muted-foreground text-xs font-medium uppercase tracking-wide',
          info && 'pr-5',
        )}
      >
        {label}
      </div>
      <div className="mt-2 min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <div
            className="min-w-0 truncate text-3xl font-semibold tabular-nums tracking-tight"
            title={typeof value === 'number' ? value.toLocaleString() : value}
          >
            {typeof value === 'number' ? compact.format(value) : value}
          </div>
          {delta != null ? (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 text-sm font-medium tabular-nums',
                tone,
              )}
            >
              <span aria-hidden className="text-[0.65rem] leading-none">
                {deltaPct != null && deltaPct >= 0 ? '▲' : '▼'}
              </span>
              {delta}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <div className="text-muted-foreground mt-1 text-xs">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
};
