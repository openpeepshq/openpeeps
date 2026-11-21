import { beforeEach, describe, expect, it, vi } from 'vitest';

// Unit-level test of the repost handler's target-group branch (#1851). A full
// Playwright integration run needs a live Postgres/Redis + the built server
// image; the handler's external dependencies are capability auth
// (`#lib/auth`) and the DB-backed post/group lookups + createPost
// (`@openpeepshq/core/*`), so those are mocked while the handler's own branch
// logic runs unmocked.
vi.mock('#lib/auth', () => ({
  ensureGroupCapabilities: vi.fn(async () => undefined),
  ensureLocalProfile: vi.fn(async () => ({ id: 'profile-1' })),
  ensureRoleCapabilities: vi.fn(async () => undefined),
}));

vi.mock('@openpeepshq/core/posts', () => ({
  createPost: vi.fn(async () => ({ id: 'new-post' }) as never),
  findPost: vi.fn(
    async () =>
      ({
        id: 'post-1',
        groupId: null,
        visibility: 'public',
        type: 'note',
      }) as never,
  ),
}));

vi.mock('@openpeepshq/core/groups', () => ({
  findGroup: vi.fn(async () => ({ id: 'group-1' }) as never),
}));

import { ensureGroupCapabilities, ensureRoleCapabilities } from '#lib/auth';
import { createPost, findPost } from '@openpeepshq/core/posts';
import { findGroup } from '@openpeepshq/core/groups';
import { apiEndpoint } from '../../api/openpeeps/core/v1/posts/[postId]/reposts/POST';

const event = {} as never;
const call = (body: { groupId?: string }) =>
  apiEndpoint.handle({
    body,
    query: {},
    param: { postId: 'post-1' },
    event,
  });

beforeEach(() => {
  vi.mocked(ensureGroupCapabilities).mockReset();
  vi.mocked(ensureRoleCapabilities).mockReset();
  vi.mocked(createPost).mockReset();
  vi.mocked(findPost).mockReset();
  vi.mocked(findGroup).mockReset();
  vi.mocked(ensureGroupCapabilities).mockResolvedValue(undefined);
  vi.mocked(ensureRoleCapabilities).mockResolvedValue({
    id: 'profile-1',
  } as never);
  vi.mocked(createPost).mockResolvedValue({ id: 'new-post' } as never);
  vi.mocked(findPost).mockResolvedValue({
    id: 'post-1',
    groupId: null,
    visibility: 'public',
    type: 'note',
  } as never);
  vi.mocked(findGroup).mockResolvedValue({ id: 'group-1' } as never);
});

describe('POST /posts/:postId/reposts with a target group (#1851)', () => {
  it('returns 403 without the target group post capability', async () => {
    vi.mocked(ensureGroupCapabilities).mockRejectedValueOnce(
      new Error('forbidden'),
    );
    await expect(call({ groupId: 'group-1' })).rejects.toThrow('forbidden');
    // The capability check ran against the target group, and no post was made.
    expect(vi.mocked(ensureGroupCapabilities)).toHaveBeenCalledWith(
      event,
      ['core-posts-create-note'],
      { id: 'group-1' },
    );
    expect(vi.mocked(createPost)).not.toHaveBeenCalled();
  });

  it('returns 404 when the target group does not exist', async () => {
    vi.mocked(findGroup).mockResolvedValueOnce(undefined);
    // 'missing' is not a uuid and would fail input validation first.
    await expect(
      call({ groupId: '00000000-0000-4000-8000-000000000000' }),
    ).rejects.toThrow();
    expect(vi.mocked(createPost)).not.toHaveBeenCalled();
  });

  it('reposts into the target group with provenance when the capability holds', async () => {
    // A direct-message source: sharing it into a group must not carry the
    // DM audience into the group post (audience edges grant read/reply).
    vi.mocked(findPost).mockResolvedValueOnce({
      id: 'post-1',
      groupId: null,
      visibility: 'direct',
      type: 'note',
      audience: [{ id: 'dm-partner-1' }],
    } as never);
    await expect(call({ groupId: 'group-1' })).resolves.toEqual({
      id: 'new-post',
    });
    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      { type: 'note' },
      { id: 'profile-1' },
      { type: 'note', visibility: 'direct', creatorId: 'profile-1' },
      expect.objectContaining({
        repostId: 'post-1',
        groupId: 'group-1',
        audience: undefined,
      }),
    );
  });

  it('keeps the existing behavior when no target group is given', async () => {
    // Source posts with an audience keep it on the feed repost (unchanged).
    vi.mocked(findPost).mockResolvedValueOnce({
      id: 'post-1',
      groupId: null,
      visibility: 'public',
      type: 'note',
      audience: [{ id: 'shared-with-1' }],
    } as never);
    await expect(call({})).resolves.toEqual({ id: 'new-post' });
    expect(vi.mocked(findGroup)).not.toHaveBeenCalled();
    // Source-post auth path: a group-less public source post checks the
    // role capability, and the repost lands without a target group.
    expect(vi.mocked(ensureRoleCapabilities)).toHaveBeenCalledWith(event, [
      'core-posts-create-note-public',
    ]);
    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        repostId: 'post-1',
        groupId: undefined,
        audience: [{ id: 'shared-with-1' }],
      }),
    );
  });
});
