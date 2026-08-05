import { describe, expect, it } from 'vitest';
import {
  aggregateSeriesIntoBuckets,
  eachUtcDay,
  resolveAnalyticsRange,
  selectChartBuckets,
  unitForDayCount,
} from './dateRange';

describe('resolveAnalyticsRange', () => {
  it('defaults to 30d', () => {
    const now = new Date('2026-08-03T12:00:00.000Z');
    const range = resolveAnalyticsRange({}, now);
    expect(range.preset).toBe('30d');
    expect(range.from).toBe('2026-07-05');
    expect(range.to).toBe('2026-08-03');
    expect(range.previousTo).toBe('2026-07-04');
  });

  it('supports custom from/to', () => {
    const range = resolveAnalyticsRange({
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(range.from).toBe('2026-01-01');
    expect(range.to).toBe('2026-01-31');
    expect(range.previousFrom).toBe('2025-12-01');
    expect(range.previousTo).toBe('2025-12-31');
  });

  it('all preset still resolves a concrete to-date', () => {
    const now = new Date('2026-08-03T12:00:00.000Z');
    const range = resolveAnalyticsRange({ preset: 'all' }, now);
    expect(range.preset).toBe('all');
    expect(range.to).toBe('2026-08-03');
    expect(range.from).toBe('1970-01-01');
  });
});

describe('eachUtcDay', () => {
  it('lists inclusive days', () => {
    expect(eachUtcDay('2026-01-01', '2026-01-03')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ]);
  });
});

describe('unitForDayCount', () => {
  it('maps range length to chart grain', () => {
    expect(unitForDayCount(1)).toBe('day');
    expect(unitForDayCount(14)).toBe('day');
    expect(unitForDayCount(15)).toBe('week');
    expect(unitForDayCount(90)).toBe('week');
    expect(unitForDayCount(91)).toBe('month');
    expect(unitForDayCount(800)).toBe('month');
    expect(unitForDayCount(801)).toBe('year');
  });
});

describe('selectChartBuckets', () => {
  it('uses days for a 7-day range', () => {
    const { unit, buckets } = selectChartBuckets('2026-08-01', '2026-08-07');
    expect(unit).toBe('day');
    expect(buckets).toHaveLength(7);
  });

  it('uses weeks for a 30-day range', () => {
    const { unit, buckets } = selectChartBuckets('2026-07-05', '2026-08-03');
    expect(unit).toBe('week');
    // 2026-07-05..2026-08-03 spans ISO weeks 27–32.
    expect(buckets.map((b) => b.label)).toEqual([
      'W27',
      'W28',
      'W29',
      'W30',
      'W31',
      'W32',
    ]);
  });

  it('uses months for a year range', () => {
    const { unit, buckets } = selectChartBuckets('2025-08-05', '2026-08-05');
    expect(unit).toBe('month');
    expect(buckets).toHaveLength(13);
  });

  it('uses years for a multi-year range', () => {
    const { unit, buckets } = selectChartBuckets('2020-01-01', '2026-08-05');
    expect(unit).toBe('year');
    expect(buckets.map((b) => b.label)).toEqual([
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
    ]);
  });

  it('aggregates daily values into buckets', () => {
    const { buckets } = selectChartBuckets('2026-08-01', '2026-08-07');
    const series = eachUtcDay('2026-08-01', '2026-08-07').map((day) => ({
      day,
      value: 2,
    }));
    const aggregated = aggregateSeriesIntoBuckets(series, buckets);
    expect(aggregated).toHaveLength(7);
    expect(aggregated.every((p) => p.value === 2)).toBe(true);
  });
});
