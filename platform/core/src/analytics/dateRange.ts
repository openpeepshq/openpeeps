import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  format,
  formatISO,
  getISOWeek,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import type {
  AnalyticsDateQuery,
  AnalyticsPreset,
  AnalyticsRangeMeta,
} from '@openpeepshq/common/types';

export type ResolvedAnalyticsRange = AnalyticsRangeMeta & {
  fromDate: Date;
  toDate: Date;
  previousFromDate: Date;
  previousToDate: Date;
};

const dayString = (d: Date) =>
  formatISO(startOfDay(d), { representation: 'date' });

const presetBounds = (
  preset: AnalyticsPreset,
  now: Date,
): { from: Date; to: Date } => {
  const to = startOfDay(now);
  switch (preset) {
    case '7d':
      return { from: subDays(to, 6), to };
    case '30d':
      return { from: subDays(to, 29), to };
    case '3m':
      return { from: subMonths(to, 3), to };
    case '6m':
      return { from: subMonths(to, 6), to };
    case '12m':
      return { from: subYears(to, 1), to };
    case 'all':
      return { from: new Date('1970-01-01T00:00:00.000Z'), to };
  }
};

export const resolveAnalyticsRange = (
  query: AnalyticsDateQuery = {},
  now = new Date(),
): ResolvedAnalyticsRange => {
  const preset = query.preset ?? (!query.from && !query.to ? '30d' : undefined);

  let fromDate: Date;
  let toDate: Date;

  if (query.from && query.to) {
    fromDate = startOfDay(parseISO(query.from));
    toDate = startOfDay(parseISO(query.to));
  } else {
    const bounds = presetBounds(preset ?? '30d', now);
    fromDate = bounds.from;
    toDate = bounds.to;
  }

  if (fromDate > toDate) {
    const tmp = fromDate;
    fromDate = toDate;
    toDate = tmp;
  }

  const lengthDays = Math.max(
    1,
    differenceInCalendarDays(toDate, fromDate) + 1,
  );
  const previousToDate = subDays(fromDate, 1);
  const previousFromDate = subDays(previousToDate, lengthDays - 1);

  return {
    from: dayString(fromDate),
    to: dayString(toDate),
    previousFrom: dayString(previousFromDate),
    previousTo: dayString(previousToDate),
    preset,
    compiledAt: null,
    fromDate,
    toDate,
    previousFromDate,
    previousToDate,
  };
};

export const eachUtcDay = (from: string, to: string): string[] => {
  const days: string[] = [];
  let cursor = startOfDay(parseISO(from));
  const end = startOfDay(parseISO(to));
  while (cursor <= end) {
    days.push(dayString(cursor));
    cursor = subDays(cursor, -1);
  }
  return days;
};

export type ChartBucketUnit = 'day' | 'week' | 'month' | 'year';

export type ChartBucket = {
  key: string;
  label: string;
  from: string;
  to: string;
};

const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

/** Map inclusive day count → chart grain. */
export const unitForDayCount = (dayCount: number): ChartBucketUnit => {
  if (dayCount <= 14) return 'day';
  if (dayCount <= 90) return 'week';
  if (dayCount <= 800) return 'month';
  return 'year';
};

const labelForUnit = (unit: ChartBucketUnit, start: Date, dayCount: number) => {
  if (unit === 'day') {
    return dayCount <= 7
      ? format(start, 'EEE').toUpperCase()
      : format(start, 'MMM d');
  }
  if (unit === 'week') return `W${getISOWeek(start)}`;
  if (unit === 'month') return format(start, 'MMM').toUpperCase();
  return format(start, 'yyyy');
};

const buildBuckets = (
  unit: ChartBucketUnit,
  fromDate: Date,
  toDate: Date,
): ChartBucket[] => {
  const dayCount = differenceInCalendarDays(toDate, fromDate) + 1;
  const buckets: ChartBucket[] = [];

  if (unit === 'day') {
    let cursor = fromDate;
    while (cursor <= toDate) {
      const key = dayString(cursor);
      buckets.push({
        key,
        label: labelForUnit('day', cursor, dayCount),
        from: key,
        to: key,
      });
      cursor = addDays(cursor, 1);
    }
    return buckets;
  }

  if (unit === 'week') {
    let cursor = weekStart(fromDate);
    while (cursor <= toDate) {
      const bucketFrom = cursor < fromDate ? fromDate : cursor;
      const weekEnd = addDays(cursor, 6);
      const bucketTo = weekEnd > toDate ? toDate : weekEnd;
      if (bucketFrom <= toDate) {
        buckets.push({
          key: dayString(cursor),
          // Label from week start so partial weeks still show the ISO week.
          label: labelForUnit('week', cursor, dayCount),
          from: dayString(bucketFrom),
          to: dayString(bucketTo),
        });
      }
      cursor = addWeeks(cursor, 1);
    }
    return buckets;
  }

  if (unit === 'month') {
    let cursor = startOfMonth(fromDate);
    while (cursor <= toDate) {
      const monthEnd = endOfMonth(cursor);
      const bucketFrom = cursor < fromDate ? fromDate : cursor;
      const bucketTo = monthEnd > toDate ? toDate : monthEnd;
      buckets.push({
        key: dayString(startOfMonth(cursor)),
        label: labelForUnit('month', cursor, dayCount),
        from: dayString(bucketFrom),
        to: dayString(bucketTo),
      });
      cursor = addMonths(cursor, 1);
    }
    return buckets;
  }

  let cursor = startOfYear(fromDate);
  while (cursor <= toDate) {
    const yearEnd = endOfYear(cursor);
    const bucketFrom = cursor < fromDate ? fromDate : cursor;
    const bucketTo = yearEnd > toDate ? toDate : yearEnd;
    buckets.push({
      key: dayString(startOfYear(cursor)),
      label: labelForUnit('year', cursor, dayCount),
      from: dayString(bucketFrom),
      to: dayString(bucketTo),
    });
    cursor = addYears(cursor, 1);
  }
  return buckets;
};

/**
 * Choose day / week / month / year buckets from the range length:
 * 1–14d → days, 15–90d → weeks, 91–800d → months, >800d → years.
 */
export const selectChartBuckets = (
  from: string,
  to: string,
): { unit: ChartBucketUnit; buckets: ChartBucket[] } => {
  const fromDate = startOfDay(parseISO(from));
  const toDate = startOfDay(parseISO(to));
  const dayCount = differenceInCalendarDays(toDate, fromDate) + 1;
  const unit = unitForDayCount(dayCount);
  return { unit, buckets: buildBuckets(unit, fromDate, toDate) };
};

export const aggregateSeriesIntoBuckets = (
  series: Array<{ day: string; value: number }>,
  buckets: ChartBucket[],
): Array<{ day: string; label: string; value: number }> => {
  const byDay = new Map(series.map((p) => [p.day, p.value]));
  return buckets.map((bucket) => {
    let value = 0;
    for (const day of eachUtcDay(bucket.from, bucket.to)) {
      value += byDay.get(day) ?? 0;
    }
    return { day: bucket.key, label: bucket.label, value };
  });
};

/** @internal exposed for tests */
export const _chartBucketInternals = {
  buildBuckets,
  unitForDayCount,
};
