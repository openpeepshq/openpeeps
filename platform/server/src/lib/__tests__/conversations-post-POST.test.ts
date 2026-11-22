import { beforeEach, describe, expect, it, vi } from 'vitest';

// Unit-level test of the conversation-post endpoint's leaver-exclusion path.
// This is the guard that keeps a share-into-conversation link note (the new
// share flow) out of a leaver's inbox: when the newest post of a DM thread is
// a leave post, the endpoint excludes the leaver from the audience it hands
// to `createPost`. The endpoint's external dependencies — auth (`#lib/auth`)
// and the DB-backed post lookups + createPost (`@openpeepshq/core/*`) — are
// mocked while the endpoint's own branch logic runs unmocked.
vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(async () => ({ id: 'profile-1' })),
  ensureScope: vi.fn(async () => undefined),
  ensurePostCapabilities: vi.fn(async () => undefined),
}));

vi.mock('@openpeepshq/core/posts', () => ({
  createPost: vi.fn(async () => ({ id: 'new-post' }) as never),
  findPost: vi.fn(),
  findLatestOneToOnePostId: vi.fn(),
  findLatestThreadPostId: vi.fn(),
  findPostsForAuth: vi.fn(),
}));

import {
  createPost,
  findLatestOneToOnePostId,
  findPostsForAuth,
  findPost,
} from '@openpeepshq/core/posts';
import { apiEndpoint } from '../../api/openpeeps/core/v1/conversations/[conversationId]/posts/POST';

const event = { context: { authData: {} } } as never;

/** A 1:1 DM root: two participants, so the thread is a one-to-one conversation. */
const dmRoot = () =>
  ({
    id: 'root-post',
    visibility: 'direct',
    type: 'note',
    profile: { id: 'profile-1' },
    audience: [{ id: 'profile-1' }, { id: 'other-1' }],
  }) as never;

/** The newest post of the thread; `leaverOut` models a leave post. */
const lastPost = (leaverId: string, leaverOut: boolean) =>
  ({
    id: 'last-post',
    inReplyToId: 'root-post',
    profile: { id: leaverId },
    // Leave posts exclude their author from the audience; normal posts don't.
    audience: leaverOut
      ? [{ id: 'profile-1' }]
      : [{ id: 'profile-1' }, { id: leaverId }],
  }) as never;

/** Full public-profile objects, valid for the endpoint's `audience` input. */
const profile = (id: string, handle: string) =>
  ({
    id,
    type: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    handle,
    displayName: `Display ${handle}`,
  }) as never;

const ME = profile('11111111-1111-4111-8111-111111111111', 'me');
const OTHER = profile('22222222-2222-4222-8222-222222222222', 'other');

const replyInput = (extra: Record<string, unknown> = {}) => ({
  visibility: 'direct',
  type: 'note',
  data: { type: 'note', content: 'https://community.example/posts/src' },
  ...extra,
});

const call = (extra?: Record<string, unknown>) =>
  apiEndpoint.handle({
    body: replyInput(extra),
    query: {},
    param: { conversationId: 'root-post' },
    event,
  });

beforeEach(() => {
  vi.mocked(createPost).mockReset();
  vi.mocked(findPost).mockReset();
  vi.mocked(findLatestOneToOnePostId).mockReset();
  vi.mocked(findPostsForAuth).mockReset();
  vi.mocked(createPost).mockResolvedValue({ id: 'new-post' } as never);
  vi.mocked(findPost).mockResolvedValueOnce(dmRoot());
  vi.mocked(findLatestOneToOnePostId).mockResolvedValue('last-post');
});

describe('POST /conversations/:id/posts leaver exclusion (#1851 S5)', () => {
  it('inherits the newest post audience minus the leaver on a leave post', async () => {
    vi.mocked(findPostsForAuth).mockResolvedValue([lastPost('other-1', true)]);

    await expect(call()).resolves.toEqual({ id: 'new-post' });

    // The share note replies to the thread's newest post and lands in the
    // inherited audience without the leaver, so the leaver's inbox no longer
    // receives future thread posts.
    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'profile-1' },
      expect.objectContaining({ visibility: 'direct' }),
      expect.objectContaining({
        inReplyToId: 'last-post',
        audience: [{ id: 'profile-1' }],
      }),
    );
  });

  it('inherits the full audience when the newest post is not a leave post', async () => {
    vi.mocked(findPostsForAuth).mockResolvedValue([lastPost('other-1', false)]);

    await expect(call()).resolves.toEqual({ id: 'new-post' });

    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'profile-1' },
      expect.objectContaining({ visibility: 'direct' }),
      expect.objectContaining({
        inReplyToId: 'last-post',
        audience: [{ id: 'profile-1' }, { id: 'other-1' }],
      }),
    );
  });

  it('drops a leaver from an explicitly supplied audience on a leave post', async () => {
    // The leave post's author is `OTHER`, who is also in the supplied audience.
    vi.mocked(findPostsForAuth).mockResolvedValue([
      lastPost('22222222-2222-4222-8222-222222222222', true),
    ]);

    await expect(call({ audience: [ME, OTHER] })).resolves.toEqual({
      id: 'new-post',
    });

    // Even when the caller supplies the full conversation audience, the
    // leave post's author is filtered out before the reply is created.
    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'profile-1' },
      expect.objectContaining({ visibility: 'direct' }),
      expect.objectContaining({
        inReplyToId: 'last-post',
        audience: [ME],
      }),
    );
  });
});
