import { describe, expect, it } from 'vitest';
import { toCsv } from './downloadCsv';

describe('toCsv', () => {
  it('joins rows with commas and newlines', () => {
    expect(
      toCsv([
        ['day', 'value'],
        ['2026-08-01', 3],
      ]),
    ).toBe('day,value\n2026-08-01,3');
  });

  it('quotes cells that contain commas or quotes', () => {
    expect(toCsv([['a,b', 'says "hi"']])).toBe('"a,b","says ""hi"""');
  });
});
