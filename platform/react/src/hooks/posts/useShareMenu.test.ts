import { describe, expect, it } from 'vitest';
import { postPublicPath } from './useShareMenu';

describe('postPublicPath', () => {
  it('builds the post path', () => {
    expect(postPublicPath({ id: 'abc' })).toBe('/posts/abc');
  });

  it('keeps a recurring event occurrence in the query', () => {
    expect(
      postPublicPath({
        id: 'evt',
        occurrenceRecurrenceId: '2026-10-23T13:00:00.000Z',
      }),
    ).toBe('/posts/evt?occurrence=2026-10-23T13%3A00%3A00.000Z');
  });
});
