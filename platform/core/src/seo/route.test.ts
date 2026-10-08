import { describe, expect, it } from 'vitest';
import { seoRoute } from './route';

const OFF = { indexProfiles: false };
const ON = { indexProfiles: true };

describe('seoRoute', () => {
  it('parses posts with and without a trailing slash', () => {
    const expected = { kind: 'post', handle: '01a1115b-7495_abc' } as const;
    expect(seoRoute('/posts/01a1115b-7495_abc', OFF)).toEqual(expected);
    expect(seoRoute('/posts/01a1115b-7495_abc/', OFF)).toEqual(expected);
  });

  it('accepts the @ prefix group and profile urls actually carry', () => {
    expect(seoRoute('/groups/@echo', OFF)).toEqual({
      kind: 'group',
      handle: 'echo',
    });
    expect(seoRoute('/groups/echo/', OFF)).toEqual({
      kind: 'group',
      handle: 'echo',
    });
    expect(seoRoute('/@alice', ON)).toEqual({
      kind: 'profile',
      handle: 'alice',
    });
  });

  it('routes profiles only when indexing them is enabled', () => {
    expect(seoRoute('/@alice', OFF)).toBeNull();
    expect(seoRoute('/@alice/', ON)).toEqual({
      kind: 'profile',
      handle: 'alice',
    });
  });

  it('does not mistake anything else for a content route', () => {
    expect(seoRoute('/', ON)).toBeNull();
    expect(seoRoute('/posts', ON)).toBeNull();
    expect(seoRoute('/posts/01a1/extra', ON)).toBeNull();
    expect(seoRoute('/groups', ON)).toBeNull();
    expect(seoRoute('/settings/profile', ON)).toBeNull();
    expect(seoRoute('/@', ON)).toBeNull();
  });
});
