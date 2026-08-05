import { Fragment } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../../lib/utils';

export type ChartPoint = {
  label: string;
  value: number;
  [key: string]: string | number;
};

type BaseChartProps = {
  data: ChartPoint[];
  className?: string;
  height?: number;
  color?: string;
  /** When true (default), Y-axis ticks are whole numbers only. */
  integerTicks?: boolean;
  /** Hide axes/grid/tooltip — useful for sparklines. */
  compact?: boolean;
};

const integerTickFormatter = (value: number) =>
  Number.isFinite(value) ? String(Math.round(value)) : '';

const yAxisProps = (integerTicks: boolean) =>
  integerTicks
    ? {
        allowDecimals: false as const,
        tickFormatter: integerTickFormatter,
      }
    : {};

export const AnalyticsBarChart = ({
  data,
  className,
  height = 240,
  color = 'var(--color-primary, #2563eb)',
  integerTicks = true,
  compact = false,
}: BaseChartProps) => (
  <div className={cn('w-full', className)} style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={compact ? { top: 0, right: 0, left: 0, bottom: 0 } : undefined}
      >
        {compact ? null : (
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
        )}
        {compact ? null : <XAxis dataKey="label" tick={{ fontSize: 11 }} />}
        {compact ? null : (
          <YAxis
            tick={{ fontSize: 11 }}
            width={40}
            {...yAxisProps(integerTicks)}
          />
        )}
        {compact ? null : <Tooltip />}
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const AnalyticsLineChart = ({
  data,
  className,
  height = 240,
  color = 'var(--color-primary, #2563eb)',
  integerTicks = true,
  compact = false,
}: BaseChartProps) => (
  <div className={cn('w-full', className)} style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={compact ? { top: 0, right: 0, left: 0, bottom: 0 } : undefined}
      >
        {compact ? null : (
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
        )}
        {compact ? null : <XAxis dataKey="label" tick={{ fontSize: 11 }} />}
        {compact ? null : (
          <YAxis
            tick={{ fontSize: 11 }}
            width={40}
            {...yAxisProps(integerTicks)}
          />
        )}
        {compact ? null : <Tooltip />}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const AnalyticsAreaChart = ({
  data,
  className,
  height = 240,
  color = 'var(--color-primary, #2563eb)',
  integerTicks = true,
  compact = false,
}: BaseChartProps) => (
  <div className={cn('w-full', className)} style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={compact ? { top: 0, right: 0, left: 0, bottom: 0 } : undefined}
      >
        {compact ? null : (
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
        )}
        {compact ? null : <XAxis dataKey="label" tick={{ fontSize: 11 }} />}
        {compact ? null : (
          <YAxis
            tick={{ fontSize: 11 }}
            width={40}
            {...yAxisProps(integerTicks)}
          />
        )}
        {compact ? null : <Tooltip />}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export type StackedSeries = {
  key: string;
  label: string;
  color: string;
};

export const AnalyticsStackedBarChart = ({
  data,
  series,
  className,
  height = 260,
  integerTicks = true,
}: {
  data: ChartPoint[];
  series: StackedSeries[];
  className?: string;
  height?: number;
  integerTicks?: boolean;
}) => (
  <div className={cn('w-full', className)} style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          width={40}
          {...yAxisProps(integerTicks)}
        />
        <Tooltip />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={s.color}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const AnalyticsMultiLineChart = ({
  data,
  series,
  className,
  height = 280,
  integerTicks = true,
}: {
  data: ChartPoint[];
  series: StackedSeries[];
  className?: string;
  height?: number;
  integerTicks?: boolean;
}) => (
  <div className={cn('w-full', className)} style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          width={40}
          {...yAxisProps(integerTicks)}
        />
        <Tooltip />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const AnalyticsStackedAreaChart = ({
  data,
  series,
  className,
  height = 280,
  integerTicks = true,
}: {
  data: ChartPoint[];
  series: StackedSeries[];
  className?: string;
  height?: number;
  integerTicks?: boolean;
}) => (
  <div className={cn('w-full', className)} style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          width={40}
          {...yAxisProps(integerTicks)}
        />
        <Tooltip />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.55}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export type DonutSlice = { label: string; value: number; color?: string };

export const AnalyticsDonutChart = ({
  data,
  className,
  height = 240,
}: {
  data: DonutSlice[];
  className?: string;
  height?: number;
}) => {
  const colors = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2'];
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="55%"
            outerRadius="80%"
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.label}
                fill={entry.color ?? colors[i % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export type HeatmapCell = { dow: number; hour: number; value: number };

export const AnalyticsHeatmap = ({
  data,
  className,
}: {
  data: HeatmapCell[];
  className?: string;
}) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const grid = Array.from({ length: 7 }, (_, dow) =>
    Array.from({ length: 24 }, (_, hour) => {
      const cell = data.find((d) => d.dow === dow && d.hour === hour);
      return cell?.value ?? 0;
    }),
  );
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="inline-grid grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-0.5">
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="text-muted-foreground text-center text-[10px]"
          >
            {h % 3 === 0 ? h : ''}
          </div>
        ))}
        {grid.map((row, dow) => (
          <Fragment key={`row-${dow}`}>
            <div className="text-muted-foreground pr-1 text-right text-[10px] leading-4">
              {dayLabels[dow]}
            </div>
            {row.map((value, hour) => (
              <div
                key={`${dow}-${hour}`}
                title={`${dayLabels[dow]} ${hour}:00 — ${value}`}
                className="h-4 w-4 rounded-sm"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--color-primary, #2563eb) ${Math.round((value / max) * 100)}%, transparent)`,
                }}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export type DayHeatmapCell = { day: string; value: number };

const dayHeatColor = (value: number, max: number) => {
  if (value <= 0) return 'var(--color-muted, #e5e7eb)';
  const pct = Math.max(18, Math.round((value / max) * 100));
  return `color-mix(in srgb, var(--color-primary, #2563eb) ${pct}%, transparent)`;
};

/** Calendar heatmap of days in a range; weeks as columns, scaled to width. */
export const AnalyticsDayHeatmap = ({
  data,
  className,
}: {
  data: DayHeatmapCell[];
  className?: string;
}) => {
  if (data.length === 0) {
    return (
      <p className={cn('text-muted-foreground text-sm', className)}>
        No data yet
      </p>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.value));
  const first = data[0]!.day;
  const last = data[data.length - 1]!.day;
  const byDay = new Map(data.map((d) => [d.day, d.value] as const));

  // Align to Monday-start weeks so the grid is dense and readable.
  const start = new Date(`${first}T00:00:00.000Z`);
  const end = new Date(`${last}T00:00:00.000Z`);
  const startDow = (start.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  start.setUTCDate(start.getUTCDate() - startDow);
  const endDow = (end.getUTCDay() + 6) % 7;
  end.setUTCDate(end.getUTCDate() + (6 - endDow));

  const cells: Array<{ day: string | null; value: number; inRange: boolean }> =
    [];
  for (
    let cursor = new Date(start.getTime());
    cursor.getTime() <= end.getTime();
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    const day = cursor.toISOString().slice(0, 10);
    const inRange = day >= first && day <= last;
    cells.push({
      day: inRange ? day : null,
      value: inRange ? (byDay.get(day) ?? 0) : 0,
      inRange,
    });
  }

  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className={cn('w-full', className)}>
      <div className="flex h-28 gap-1 sm:h-32">
        <div className="text-muted-foreground flex w-3 shrink-0 flex-col justify-between py-0.5 text-[9px] leading-none">
          {weekdayLabels.map((label, i) => (
            <span key={`${label}-${i}`} className="flex flex-1 items-center">
              {i % 2 === 0 ? label : ''}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex min-w-0 flex-1 flex-col gap-[3px]">
              {week.map((cell, di) => (
                <div
                  key={cell.day ?? `pad-${wi}-${di}`}
                  title={
                    cell.day ? `${cell.day} — ${cell.value}` : undefined
                  }
                  className={cn(
                    'min-h-0 flex-1 rounded-[2px]',
                    !cell.inRange && 'opacity-0',
                  )}
                  style={
                    cell.inRange
                      ? { backgroundColor: dayHeatColor(cell.value, max) }
                      : undefined
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between text-[10px]">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
};
