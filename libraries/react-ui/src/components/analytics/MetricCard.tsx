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
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${deltaPct}%`;
};

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
        'bg-background relative flex min-h-28 flex-col justify-between rounded-xl border p-4 shadow-sm',
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
      <div className="mt-2">
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-semibold tabular-nums tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {delta != null ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-sm font-medium tabular-nums',
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
