import { describe, expect, it } from 'vitest';
import { normalizeComputedDatetime, normalizeIsoDatetime } from './mappers';

describe('normalizeIsoDatetime', () => {
  it('converts Postgres timestamptz offsets to UTC Z', () => {
    expect(normalizeIsoDatetime('2025-02-06 14:53:35.244+00')).toBe(
      '2025-02-06T14:53:35.244Z',
    );
  });
});

describe('normalizeComputedDatetime', () => {
  it('normalizes string timestamps and blanks nullish values', () => {
    expect(normalizeComputedDatetime('2025-02-06 14:53:35.244+00')).toBe(
      '2025-02-06T14:53:35.244Z',
    );
    expect(normalizeComputedDatetime(null)).toBeNull();
    expect(normalizeComputedDatetime('')).toBeNull();
    expect(
      normalizeComputedDatetime(new Date('2025-02-06T14:53:35.244Z')),
    ).toBe('2025-02-06T14:53:35.244Z');
  });
});
