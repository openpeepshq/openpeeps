import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';
import type { CapabilitiesConfig } from '@openpeepshq/common/types';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

const {
  findPost,
  findGroupByHandle,
  findProfileByHandle,
  capabilitiesConfig,
  redisGet,
  redisSet,
} = vi.hoisted(() => ({
  findPost: vi.fn(),
  findGroupByHandle: vi.fn(),
  findProfileByHandle: vi.fn(),
  capabilitiesConfig: vi.fn(),
  redisGet: vi.fn(async () => null),
  redisSet: vi.fn(async () => undefined),
}));

vi.mock('../posts', () => ({ findPost }));
vi.mock('../groups', () => ({ findGroupByHandle, listGroups: vi.fn() }));
vi.mock('../profiles', () => ({ findProfileByHandle, listProfiles: vi.fn() }));
vi.mock('../config', () => ({ capabilitiesConfig }));
vi.mock('../redis', () => ({
  getSharedConnection: async () => ({ get: redisGet, set: redisSet }),
}));

import { spaMetaForPath } from './index';

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

beforeEach(() => {
  vi.mocked(redisGet).mockClear();
  vi.mocked(redisSet).mockClear();
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
});
