import type {
  AnalyticsMetricCard,
  AnalyticsSeriesPoint,
} from '@openpeepshq/common/types';

export const deltaPct = (
  current: number,
  previous: number,
): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

export const metricCard = (
  key: string,
  value: number,
  previousValue: number,
  series?: AnalyticsSeriesPoint[],
): AnalyticsMetricCard => ({
  key,
  value,
  previousValue,
  deltaPct: deltaPct(value, previousValue),
  series,
});

export const sumSeries = (series: AnalyticsSeriesPoint[]) =>
  series.reduce((acc, p) => acc + p.value, 0);
