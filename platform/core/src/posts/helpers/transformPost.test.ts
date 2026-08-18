import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbPost, ProfileWithMeta } from '@openpeepshq/common/types';
import {
  DELETED_AUTHOR_DISPLAY_NAME,
  DELETED_AUTHOR_HANDLE,
} from '@openpeepshq/common/lib';

vi.mock('../../profiles/cache', () => ({
  getPublicProfile: vi.fn(),
}));

import { getPublicProfile } from '../../profiles/cache';
import { transformPost } from './index';

const deletedAuthor = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'local',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
  deletedAt: '2024-06-01T00:00:00.000Z',
  handle: 'goneuser',
  displayName: 'Gone User',
  avatar: 'https://example.com/a.png',
  bio: 'private',
  roles: [],
  followers: [],
  following: [],
  controllers: [],
  memberships: [],
  profileStats: {},
} as unknown as ProfileWithMeta;

const activeAuthor = {
  ...deletedAuthor,
  id: '22222222-2222-4222-8222-222222222222',
  deletedAt: null,
  handle: 'active',
  displayName: 'Active User',
} as unknown as ProfileWithMeta;

const basePost = {
  id: '33333333-3333-4333-8333-333333333333',
  type: 'status',
  visibility: 'direct',
  createdAt: '2024-05-01T00:00:00.000Z',
  updatedAt: '2024-05-01T00:00:00.000Z',
  creatorId: deletedAuthor.id,
  data: { content: 'hello' },
  entries: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      type: 'create',
      createdAt: '2024-05-01T00:00:00.000Z',
      updatedAt: '2024-05-01T00:00:00.000Z',
      data: {},
      profile: { id: deletedAuthor.id },
    },
  ],
  reactions: [],
  mentions: [],
  tags: [],
  audience: [],
  replyCount: 0,
  repostCount: 0,
  rsvps: [],
} as unknown as DbPost;

describe('transformPost deleted authors', () => {
  beforeEach(() => {
    vi.mocked(getPublicProfile).mockReset();
    vi.mocked(getPublicProfile).mockImplementation(async (id: string) => {
      if (id === deletedAuthor.id) return deletedAuthor;
      if (id === activeAuthor.id) return activeAuthor;
      return undefined;
    });
  });

  it('anonymizes soft-deleted create-entry authors', async () => {
    const result = await transformPost(basePost);
    expect(result.profile.handle).toBe(DELETED_AUTHOR_HANDLE);
    expect(result.profile.displayName).toBe(DELETED_AUTHOR_DISPLAY_NAME);
    expect(result.profile.avatar).toBeNull();
    expect(result.profile.bio).toBeUndefined();
    expect(result.profile.deletedAt).toBe(deletedAuthor.deletedAt);
    expect(result.entries[0]?.profile.handle).toBe(DELETED_AUTHOR_HANDLE);
  });

  it('anonymizes nested replyTo authors', async () => {
    const child = {
      ...basePost,
      id: '55555555-5555-4555-8555-555555555555',
      creatorId: activeAuthor.id,
      entries: [
        {
          ...basePost.entries![0],
          id: '66666666-6666-4666-8666-666666666666',
          profile: { id: activeAuthor.id },
        },
      ],
      replyTo: basePost,
    } as unknown as DbPost;

    const result = await transformPost(child);
    expect(result.profile.handle).toBe('active');
    expect(result.replyTo?.profile.handle).toBe(DELETED_AUTHOR_HANDLE);
    expect(result.replyTo?.profile.displayName).toBe(
      DELETED_AUTHOR_DISPLAY_NAME,
    );
  });
});
