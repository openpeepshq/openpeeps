import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';
import type { CapabilitiesConfig } from '@openpeepshq/common/types';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

const {
  findPost,
  findPostBySlug,
  findGroupByHandle,
  findProfileByHandle,
  listPosts,
  listGroups,
  listProfiles,
  capabilitiesConfig,
  redisGet,
  redisSet,
} = vi.hoisted(() => ({
  findPost: vi.fn(),
  findPostBySlug: vi.fn(),
  findGroupByHandle: vi.fn(),
  findProfileByHandle: vi.fn(),
  listPosts: vi.fn(async () => []),
  listGroups: vi.fn(async () => []),
  listProfiles: vi.fn(async () => []),
  capabilitiesConfig: vi.fn(),
  redisGet: vi.fn(async () => null),
  redisSet: vi.fn(async () => undefined),
}));

vi.mock('../posts', () => ({ findPost, findPostBySlug, listPosts }));
vi.mock('../groups', () => ({ findGroupByHandle, listGroups }));
vi.mock('../profiles', () => ({ findProfileByHandle, listProfiles }));
vi.mock('../config', () => ({ capabilitiesConfig }));
vi.mock('../redis', () => ({
  getSharedConnection: async () => ({ get: redisGet, set: redisSet }),
}));

import { crawlableEntries, spaMetaForPath } from './index';

/** Capabilities config shape: post caps for local/audience, none for profile. */
const config = {
  post: {
    local: { add: ['core-posts-read'] },
    audience: { add: ['core-posts-read'] },
  },
  profile: {
    none: { add: ['core-profiles-read'] },
  },
} as unknown as CapabilitiesConfig;

/** Profile that passes `profileWithMetaSchema.safeParse` (the schema guard). */
const profile = (handle: string, roles = []): ProfileWithMeta =>
  ({
    id: '00000000-0000-1000-8000-000000000001',
    handle,
    type: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    roles,
    followers: [],
    following: [],
    controllers: [],
    memberships: [],
    profileStats: { followersCount: 0, followingCount: 0 },
    blockingIds: [],
    blockedByIds: [],
    followedHashtags: [],
  }) as unknown as ProfileWithMeta;

/** Post that passes `postWithMetaSchema.safeParse` (the schema guard). */
const post = (id: string, visibility: string, group?: GroupWithMeta) =>
  ({
    id: '00000000-0000-1000-8000-000000000002',
    type: 'note',
    profile: profile('author'),
    creatorId: '00000000-0000-1000-8000-000000000003',
    data: { type: 'note', content: 'Hello world' },
    entries: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-02T00:00:00.000Z',
    visibility,
    repostCount: 0,
    replyCount: 0,
    reactions: [],
    reposts: [],
    mentions: [],
    tags: [],
    rsvps: [],
    group: group ?? null,
    accountInteractions: {
      favorited: false,
      reposted: false,
      muted: false,
      bookmarked: false,
      pinned: false,
    },
  }) as unknown as PostWithMeta;

/**
 * Article post for slug-route tests. `data` matches `articleSchema`
 * (type + slug + instanceScoped) so the `'slug' in post.data` /
 * `'instanceScoped' in post.data` branches in `crawlableEntries` are exercised
 * against real article shapes.
 */
const article = (
  slug: string | undefined,
  instanceScoped: boolean | undefined,
  handle: string | null = 'author',
) => {
  const data: Record<string, unknown> = {
    type: 'article',
    title: 'My article',
    content: 'Article body',
  };
  if (slug !== undefined) data.slug = slug;
  if (instanceScoped !== undefined) data.instanceScoped = instanceScoped;
  // `handle === null` models a post whose profile carries no handle: the
  // crawler layer must then emit no `/{handle}/{slug}` path at all.
  return {
    ...post('p-articleslug', 'public'),
    id: 'p-articleslug',
    profile:
      handle === null
        ? ({ ...(profile('author') as object), handle: null } as never)
        : profile(handle),
    data,
  } as unknown as PostWithMeta;
};

beforeEach(() => {
  // `redisGet.mockResolvedValue` in the cache test below otherwise sticks for
  // the rest of the file — restore the "no cache" default on every test.
  vi.mocked(redisGet).mockReset();
  vi.mocked(redisGet).mockImplementation(async () => null);
  vi.mocked(redisSet).mockReset();
  vi.mocked(findPostBySlug).mockReset();
});

describe('spaMetaForPath (anonymous readability)', () => {
  it('returns meta for a readable public post', async () => {
    capabilitiesConfig.mockResolvedValue(config);
    findPost.mockResolvedValue(post('p1', 'public'));
    const result = await spaMetaForPath('/posts/p1', { indexProfiles: false });
    expect(result).toEqual({
      meta: {
        title: 'Hello world',
        description: 'Hello world',
        kind: 'post',
        datePublished: '2026-03-01T00:00:00.000Z',
        dateModified: '2026-03-02T00:00:00.000Z',
        authorName: '@author',
      },
    });
  });

  it('resolves an anonymous local-visibility post on a private community to null meta', async () => {
    capabilitiesConfig.mockResolvedValue(config);
    // New events default to `local` visibility when publicContent is false.
    findPost.mockResolvedValue(post('p2', 'local'));
    expect(await spaMetaForPath('/posts/p2', { indexProfiles: false })).toEqual(
      {
        meta: null,
      },
    );
    expect(redisSet).toHaveBeenCalledWith(
      'seo:meta:v5:/posts/p2',
      JSON.stringify({ meta: null }),
      { EX: 300 },
    );
  });

  it('resolves an unknown post id to the same null meta, not a not-found verdict', async () => {
    capabilitiesConfig.mockResolvedValue(config);
    findPost.mockResolvedValue(undefined);
    expect(
      await spaMetaForPath('/posts/missing', { indexProfiles: false }),
    ).toEqual({
      meta: null,
    });
  });

  it('keeps group pages readable for anonymous callers via the none capability', async () => {
    findGroupByHandle.mockResolvedValue({
      handle: 'jam',
      displayName: 'Jam Group',
      description: 'Weekly jam',
      capabilities: { none: { add: ['core-groups-read'] } },
    });
    expect(
      await spaMetaForPath('/groups/@jam', { indexProfiles: false }),
    ).toEqual({
      meta: { title: 'Jam Group', description: 'Weekly jam' },
    });
  });

  it('resolves a group without the none read capability to null meta', async () => {
    findGroupByHandle.mockResolvedValue({
      handle: 'private',
      capabilities: { none: { add: [] } },
    });
    expect(
      await spaMetaForPath('/groups/@private', { indexProfiles: false }),
    ).toEqual({ meta: null });
  });

  it('resolves profile routes to null when indexProfiles is disabled', async () => {
    findProfileByHandle.mockResolvedValue(profile('alice'));
    expect(await spaMetaForPath('/@alice', { indexProfiles: false })).toEqual({
      meta: null,
    });
    expect(findProfileByHandle).not.toHaveBeenCalled();
  });

  it('returns profile meta when indexProfiles is enabled', async () => {
    findProfileByHandle.mockResolvedValue({
      ...profile('alice'),
      displayName: 'Alice',
      bio: 'Hi',
    });
    expect(await spaMetaForPath('/@alice', { indexProfiles: true })).toEqual({
      meta: { title: 'Alice', description: 'Hi' },
    });
  });

  it('does not read the cache on a fresh path and stores the resolved verdict', async () => {
    capabilitiesConfig.mockResolvedValue(config);
    findPost.mockResolvedValue(post('p3', 'public'));
    const result = await spaMetaForPath('/posts/p3', { indexProfiles: false });
    expect(result.meta).toBeTruthy();
    expect(redisGet).toHaveBeenCalledWith('seo:meta:v5:/posts/p3');
    expect(redisSet).toHaveBeenCalledWith(
      'seo:meta:v5:/posts/p3',
      expect.stringContaining('"meta":{"title"'),
      { EX: 300 },
    );
  });

  it('serves the cached verdict without re-resolving', async () => {
    vi.mocked(redisGet).mockResolvedValue(
      JSON.stringify({ meta: { title: 'Cached', description: 'From cache' } }),
    );
    findPost.mockResolvedValue(undefined);
    vi.mocked(findPost).mockClear();
    const result = await spaMetaForPath('/posts/cached', {
      indexProfiles: false,
    });
    expect(result).toEqual({
      meta: { title: 'Cached', description: 'From cache' },
    });
    expect(findPost).not.toHaveBeenCalled();
  });

  it('resolves a profile-scoped slug route to the article meta (refactored post branch)', async () => {
    // `/alice/first-post` is a profile-scoped slug; `resolveMeta` routes it
    // through `findPostBySlug`, then the shared post branch builds the meta.
    capabilitiesConfig.mockResolvedValue(config);
    findPostBySlug.mockResolvedValue(article('first-post', false, 'alice'));
    const result = await spaMetaForPath('/alice/first-post', {
      indexProfiles: false,
    });
    expect(findPostBySlug).toHaveBeenCalledWith('first-post', 'alice', false);
    expect(result).toEqual({
      meta: {
        title: 'My article',
        description: 'Article body',
        kind: 'post',
        datePublished: '2026-03-01T00:00:00.000Z',
        dateModified: '2026-03-02T00:00:00.000Z',
        authorName: '@alice',
      },
    });
  });

  it('resolves an instance-scoped slug route to the article meta (refactored post branch)', async () => {
    // `/<long-slug>` (a >16-char, non-handle-shaped segment) is an
    // instance-scoped slug; resolution and meta shape go through the same
    // post branch as `/{handle}/{slug}`.
    capabilitiesConfig.mockResolvedValue(config);
    findPostBySlug.mockResolvedValue(article('my-long-instance-slug', true));
    const result = await spaMetaForPath('/my-long-instance-slug', {
      indexProfiles: false,
    });
    expect(findPostBySlug).toHaveBeenCalledWith(
      'my-long-instance-slug',
      undefined,
      true,
    );
    expect(result.meta).toMatchObject({
      title: 'My article',
      kind: 'post',
      authorName: '@author',
    });
  });

  it('resolves a slug route to null meta when no article exists', async () => {
    capabilitiesConfig.mockResolvedValue(config);
    findPostBySlug.mockResolvedValue(null);
    expect(
      await spaMetaForPath('/alice/missing-slug', { indexProfiles: false }),
    ).toEqual({ meta: null });
  });
});

describe('crawlableEntries (profile sitemap exposure)', () => {
  beforeEach(() => {
    vi.mocked(listPosts).mockClear();
    vi.mocked(listGroups).mockClear();
    vi.mocked(listProfiles).mockClear();
    vi.mocked(findPostBySlug).mockClear();
  });

  it('queries profiles through the directory view so opted-out profiles stay out of the sitemap', async () => {
    const entries = await crawlableEntries({ indexProfiles: true });
    // Exactly one profile-listing call with the exact directory-view args —
    // an extra call, a dropped viewer/second argument, or any arg drift
    // (e.g. `{ directoryView: false }`, which would silently re-expose
    // opted-out profiles in the sitemap) fails this pin.
    expect(listProfiles).toHaveBeenCalledTimes(1);
    expect(listProfiles).toHaveBeenCalledWith(undefined, {
      directoryView: true,
    });
    expect(entries).toEqual([{ path: '/' }]);
  });

  it('never queries profiles when indexing is disabled', async () => {
    const entries = await crawlableEntries({ indexProfiles: false });
    expect(listProfiles).not.toHaveBeenCalled();
    expect(entries).toEqual([{ path: '/' }]);
  });

  it('emits the canonical instance-scoped slug path for an instance-scoped article', async () => {
    vi.mocked(listPosts).mockResolvedValue([
      article('my-slug', true, 'author'),
    ]);
    const entries = await crawlableEntries({ indexProfiles: false });
    // The canonical instance spelling `/{slug}` — not the profile spelling —
    // goes in the sitemap, alongside the `/posts/:id` path.
    expect(entries).toContainEqual({
      path: '/my-slug',
      updatedAt: '2026-03-02T00:00:00.000Z',
    });
    expect(entries).toContainEqual({
      path: '/posts/p-articleslug',
      updatedAt: '2026-03-02T00:00:00.000Z',
    });
    expect(entries).not.toContainEqual(
      expect.objectContaining({ path: '/author/my-slug' }),
    );
  });

  it('emits the canonical profile-scoped slug path for a profile-scoped article', async () => {
    vi.mocked(listPosts).mockResolvedValue([
      article('my-slug', false, 'author'),
    ]);
    const entries = await crawlableEntries({ indexProfiles: false });
    // Profile-scoped: `/{handle}/{slug}`, never the bare instance spelling.
    expect(entries).toContainEqual({
      path: '/author/my-slug',
      updatedAt: '2026-03-02T00:00:00.000Z',
    });
    expect(entries).not.toContainEqual(
      expect.objectContaining({ path: '/my-slug' }),
    );
  });

  it('emits no slug path when the article has no slug', async () => {
    vi.mocked(listPosts).mockResolvedValue([article(undefined, undefined)]);
    const entries = await crawlableEntries({ indexProfiles: false });
    // Only the post id path, no slug entry.
    expect(entries).toEqual([
      { path: '/' },
      { path: '/posts/p-articleslug', updatedAt: '2026-03-02T00:00:00.000Z' },
    ]);
  });

  it('emits no slug path for a profile-scoped article whose profile has no handle', async () => {
    vi.mocked(listPosts).mockResolvedValue([article('my-slug', false, null)]);
    const entries = await crawlableEntries({ indexProfiles: false });
    // Without a profile handle there is no `/{handle}/{slug}` to emit.
    expect(entries).toEqual([
      { path: '/' },
      { path: '/posts/p-articleslug', updatedAt: '2026-03-02T00:00:00.000Z' },
    ]);
  });

  it('treats `instanceScoped` as absent (profile-scoped) when the key is missing, even with a slug', async () => {
    // The boundary the review called out: `'instanceScoped' in post.data` must
    // be checked, not `post.data.instanceScoped === true`. A profile-scoped
    // article that simply omitted the key must still emit `/{handle}/{slug}`.
    vi.mocked(listPosts).mockResolvedValue([
      article('my-slug', undefined, 'author'),
    ]);
    const entries = await crawlableEntries({ indexProfiles: false });
    expect(entries).toContainEqual({
      path: '/author/my-slug',
      updatedAt: '2026-03-02T00:00:00.000Z',
    });
    expect(entries).not.toContainEqual(
      expect.objectContaining({ path: '/my-slug' }),
    );
  });
});
