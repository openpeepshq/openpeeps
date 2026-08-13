import { describe, expect, it } from 'vitest';
import { averageSeries, sumSeries } from './metrics';

describe('averageSeries', () => {
  it('returns 0 for an empty series', () => {
    expect(averageSeries([])).toBe(0);
  });

  it('returns the mean of daily values', () => {
    expect(
      averageSeries([
        { day: '2026-08-01', value: 10 },
        { day: '2026-08-02', value: 20 },
        { day: '2026-08-03', value: 12 },
      ]),
    ).toBe(14);
  });
});

describe('sumSeries', () => {
  it('sums values', () => {
    expect(
      sumSeries([
        { day: '2026-08-01', value: 10 },
        { day: '2026-08-02', value: 5 },
      ]),
    ).toBe(15);
  });
});
