import { describe, expect, it } from 'vitest';
import { countJobsFinishedSince, sumMetricPoints } from './activity';

describe('job activity helpers', () => {
  it('sums metric minute buckets', () => {
    expect(sumMetricPoints([1, '2', 0])).toBe(3);
    expect(sumMetricPoints([])).toBe(0);
  });

  it('counts jobs finished since a cutoff', () => {
    const since = 1_000;
    expect(
      countJobsFinishedSince(
        [
          { finishedOn: 1_500 },
          { finishedOn: 999 },
          { finishedOn: null },
          {},
          { finishedOn: 1_000 },
        ],
        since,
      ),
    ).toBe(2);
  });
});
