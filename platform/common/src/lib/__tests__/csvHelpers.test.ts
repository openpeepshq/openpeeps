import { describe, expect, it } from 'vitest';
import { escapeCsvCell, toCsvRow } from '../csvHelpers';

describe('csvHelpers', () => {
  it('escapes values containing commas and quotes', () => {
    expect(escapeCsvCell('hello, world')).toBe('"hello, world"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('builds csv rows', () => {
    expect(toCsvRow(['a', 'b,c', 3])).toBe('a,"b,c",3');
  });
});
