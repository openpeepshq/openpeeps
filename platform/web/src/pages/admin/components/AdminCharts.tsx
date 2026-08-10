import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AdminServerStats } from '@openpeepshq/common/types';
import { useT } from '@openpeepshq/react';
import { PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';

export function CommunityStatsCard({
  title,
  current,
  previous,
  text,
}: {
  title: string;
  current: number;
  previous: number;
  text: string;
}) {
  const change = current - previous;
  return (
    <div className="flex h-36 w-full flex-col items-center justify-center rounded-md border p-4">
      <h3 className="text-muted-foreground text-sm">{title}</h3>
      <div className="my-2 flex items-center gap-1">
        <span className="text-4xl font-semibold">{current}</span>
        {change < 0 ? (
          <span className="text-error flex items-center text-sm">
            ▼ {Math.abs(change)}
          </span>
        ) : change > 0 ? (
          <span className="text-success flex items-center text-sm">
            ▲ {change}
          </span>
        ) : null}
      </div>
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <p>{text}</p>
        <span>·</span>
        <p>{previous}</p>
      </div>
    </div>
  );
}

export interface BarChartDatum {
  name: string;
  count: number;
}

/**
 * Minimal dependency-free SVG bar chart. Replaces the Svelte LayerChart
 * implementation which is unavailable in the React stack.
 */
export function BarChart({
  data,
  height = 280,
}: {
  data: BarChartDatum[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const barGap = 8;
  const count = Math.max(1, data.length);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex h-full items-end gap-2" style={{ gap: barGap }}>
        {data.map((datum, index) => {
          const ratio = datum.count / max;
          return (
            <div
              key={`${datum.name}-${index}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              style={{ width: `${100 / count}%` }}
              title={`${datum.name}: ${datum.count}`}
            >
              <span className="text-muted-foreground mb-1 text-[10px]">
                {datum.count}
              </span>
              <div
                className="bg-primary w-full rounded-t"
                style={{ height: `${Math.max(2, ratio * (height - 40))}px` }}
              />
              <span className="text-muted-foreground mt-1 w-full truncate text-center text-[10px]">
                {datum.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type SignupPeriod = keyof AdminServerStats['timelines']['signups'];

const SIGNUP_PERIODS: SignupPeriod[] = ['week', 'fourWeeks', 'fourMonths'];

export function SignupChart({ stats }: { stats: AdminServerStats }) {
  const t = useT();
  const [period, setPeriod] = useState<SignupPeriod>('week');
  const data = stats.timelines.signups[period] ?? [];

  return (
    <div className="rounded-md border p-4">
      <BarChart data={data} />
      <div className="mt-2 flex items-center gap-2">
        <h2 className="text-base capitalize">
          {t(`admin.signupChart.${period}`, { defaultValue: 'Signups' })}
        </h2>
        <PopupMenu icon={ChevronDown} iconSize={20} placement="bottom-start">
          {SIGNUP_PERIODS.map((item) => (
            <PopupMenuButton
              key={item}
              title={t(`admin.signupChart.${item}`, { defaultValue: item })}
              text={t(`admin.signupChart.${item}`, { defaultValue: item })}
              action={() => setPeriod(item)}
            />
          ))}
        </PopupMenu>
      </div>
    </div>
  );
}
