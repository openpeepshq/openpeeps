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

describe('seoRoute slug routes (articles)', () => {
  const OFF = { indexProfiles: false };
  const ON = { indexProfiles: true };
  // A bare instance slug must be long enough to not be handle-shaped (handles
  // are ≤16 chars), otherwise the `/:handle` profile route owns it.
  const INSTANCE = 'my-very-long-article-slug';

  it('parses an instance-scoped slug and its trailing-slash spelling', () => {
    expect(seoRoute(`/${INSTANCE}`, ON)).toEqual({
      kind: 'slug',
      slug: INSTANCE,
      instanceScoped: true,
    });
    expect(seoRoute(`/${INSTANCE}/`, ON)).toEqual({
      kind: 'slug',
      slug: INSTANCE,
      instanceScoped: true,
    });
  });

  it('parses a profile-scoped slug with and without the @ prefix', () => {
    const expected = {
      kind: 'slug',
      handle: 'alice',
      slug: 'first-post',
      instanceScoped: false,
    } as const;
    expect(seoRoute('/alice/first-post', ON)).toEqual(expected);
    expect(seoRoute('/@alice/first-post', ON)).toEqual(expected);
    expect(seoRoute('/alice/first-post/', ON)).toEqual(expected);
  });

  it('rejects a handle-shaped bare segment as an instance slug (it is a /:handle route)', () => {
    expect(seoRoute('/my-slug', ON)).toBeNull();
    expect(seoRoute('/short', ON)).toBeNull();
  });

  it('rejects reserved top-level and profile-sub routes as slug paths', () => {
    expect(seoRoute('/admin/anything', ON)).toBeNull();
    expect(seoRoute('/articles/anything', ON)).toBeNull();
    expect(seoRoute('/alice/followers', ON)).toBeNull();
  });

  it('pins the code-of-conduct page as a non-slug route', () => {
    // Suggestion #1: `/code-of-conduct` must never resolve as an article slug.
    expect(seoRoute('/code-of-conduct', ON)).toBeNull();
    expect(seoRoute('/code-of-conduct', OFF)).toBeNull();
  });

  it('recognises slug routes even when profile indexing is off (they are post routes the sitemap always lists)', () => {
    expect(seoRoute(`/${INSTANCE}`, OFF)).toEqual({
      kind: 'slug',
      slug: INSTANCE,
      instanceScoped: true,
    });
    expect(seoRoute('/alice/first-post', OFF)).toEqual({
      kind: 'slug',
      handle: 'alice',
      slug: 'first-post',
      instanceScoped: false,
    });
  });
});
