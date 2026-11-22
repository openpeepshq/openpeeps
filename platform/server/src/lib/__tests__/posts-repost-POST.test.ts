import { beforeEach, describe, expect, it, vi } from 'vitest';

// Unit-level test of the repost handler's default path (#1851, round-5
// re-sign): a plain Repost of a group-source post must land in the *source*
// group (the `groupId` carry-over) and keep the source visibility/audience —
// the endpoint takes no target parameter; cross-visibility sharing is link-
// only (a new note with the post URL), never a repost. A full Playwright
// integration run needs a live Postgres/Redis + the built server image; the
// handler's external dependencies are capability auth (`#lib/auth`) and the
// DB-backed post lookups + createPost (`@openpeepshq/core/*`), so those are
// mocked while the handler's own branch logic runs unmocked.
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
        groupId: 'group-1',
        visibility: 'group',
        type: 'note',
      }) as never,
  ),
}));

import { ensureGroupCapabilities, ensureRoleCapabilities } from '#lib/auth';
import { createPost, findPost } from '@openpeepshq/core/posts';
import { apiEndpoint } from '../../api/openpeeps/core/v1/posts/[postId]/reposts/POST';

const event = {} as never;
const call = (body?: { groupId?: string }) =>
  apiEndpoint.handle({
    body: body ?? {},
    query: {},
    param: { postId: 'post-1' },
    event,
  });

beforeEach(() => {
  vi.mocked(ensureGroupCapabilities).mockReset();
  vi.mocked(ensureRoleCapabilities).mockReset();
  vi.mocked(createPost).mockReset();
  vi.mocked(findPost).mockReset();
  vi.mocked(ensureGroupCapabilities).mockResolvedValue(undefined);
  vi.mocked(ensureRoleCapabilities).mockResolvedValue({
    id: 'profile-1',
  } as never);
  vi.mocked(createPost).mockResolvedValue({ id: 'new-post' } as never);
  vi.mocked(findPost).mockResolvedValue({
    id: 'post-1',
    groupId: 'group-1',
    visibility: 'group',
    type: 'note',
  } as never);
});

describe('POST /posts/:postId/reposts default path (#1851 round-5)', () => {
  it('carries a group-source post into its source group (no orphan repost)', async () => {
    // Round-5 finding 1: a plain Repost of a group post must land in the
    // source group — the group edge is what makes group visibility
    // renderable for members, so dropping the carry-over orphans the post.
    vi.mocked(findPost).mockResolvedValue({
      id: 'post-1',
      groupId: 'group-1',
      visibility: 'group',
      type: 'note',
      group: { id: 'group-1' },
    } as never);
    await expect(call()).resolves.toEqual({ id: 'new-post' });
    // Source-group auth path: the viewer needs the source group's
    // create capability (not a role capability).
    expect(vi.mocked(ensureGroupCapabilities)).toHaveBeenCalledWith(
      event,
      ['core-posts-create-note'],
      { id: 'group-1' },
    );
    expect(vi.mocked(ensureRoleCapabilities)).not.toHaveBeenCalled();
    // The repost inherits the source group (the round-5 orphan regression
    // would pass `groupId: undefined` here).
    expect(vi.mocked(createPost)).toHaveBeenCalledWith(
      { type: 'note' },
      { id: 'profile-1' },
      { type: 'note', visibility: 'group', creatorId: 'profile-1' },
      expect.objectContaining({
        repostId: 'post-1',
        groupId: 'group-1',
        audience: undefined,
      }),
    );
  });

  it('keeps the source visibility and audience for a feed post', async () => {
    vi.mocked(findPost).mockResolvedValue({
      id: 'post-1',
      groupId: null,
      visibility: 'local',
      type: 'note',
      audience: [{ id: 'shared-with-1' }],
    } as never);
    await expect(call()).resolves.toEqual({ id: 'new-post' });
    // Feed-post auth path: the role capability for the source visibility.
    expect(vi.mocked(ensureRoleCapabilities)).toHaveBeenCalledWith(event, [
      'core-posts-create-note-local',
    ]);
    expect(vi.mocked(ensureGroupCapabilities)).not.toHaveBeenCalled();
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

  it('returns 404 when the source post does not exist', async () => {
    vi.mocked(findPost).mockResolvedValue(undefined);
    await expect(call()).rejects.toThrow();
    expect(vi.mocked(createPost)).not.toHaveBeenCalled();
  });
});
