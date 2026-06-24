import { describe, expect, it } from 'vitest';
import { escapeCsvCell, toCsvRow, formatMemberExportCustomFields } from '../csvHelpers';

describe('csvHelpers', () => {
  it('escapes values containing commas and quotes', () => {
    expect(escapeCsvCell('hello, world')).toBe('"hello, world"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('builds csv rows', () => {
    expect(toCsvRow(['a', 'b,c', 3])).toBe('a,"b,c",3');
  });

  it('serializes custom fields as JSON for safe CSV export', () => {
    expect(
      formatMemberExportCustomFields([
        { name: 'Site', value: 'https://example.com' },
        { name: 'Note', value: 'a; b: c' },
      ]),
    ).toBe(
      '[{"name":"Site","value":"https://example.com"},{"name":"Note","value":"a; b: c"}]',
    );
    expect(formatMemberExportCustomFields([])).toBe('');
  });
});
