import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';

// The reject handler's only external dependencies are the DB-backed jam lookup
// and the reject action (both via `@openpeepshq/core/jams`) and local-profile
// auth (`#lib/auth`). The moderation gate (`canModerateJam`) is a pure helper,
// so it runs unmocked against a real jam post.
vi.mock('@openpeepshq/core/jams', () => ({
  findJamEvent: vi.fn(),
  rejectFromWaitingRoom: vi.fn(async () => undefined),
}));
vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(),
}));

import { findJamEvent, rejectFromWaitingRoom } from '@openpeepshq/core/jams';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded } from '#lib/errors';
import { apiEndpoint } from '../../api/openpeeps/core/v1/jams/[eventId]/waiting-room/[profileId]/reject/POST';

const jamPost = {
  id: 'ev1',
  visibility: 'public',
  creatorId: 'mod-1',
  data: {
    type: 'event',
    jam: { id: 'jam1', waitingRoom: true, moderators: ['mod-1'] },
  },
} as unknown as PostWithMeta;

const call = (
  profileId: string,
  eventId = 'ev1',
  profile?: { id: string },
  query: Record<string, string> = {},
) => {
  vi.mocked(findJamEvent).mockResolvedValue(jamPost);
  vi.mocked(ensureLocalProfile).mockResolvedValue(profile as never);
  return apiEndpoint.handle({
    body: {},
    query,
    param: { eventId, profileId },
    event: {},
  });
};

beforeEach(() => {
  vi.mocked(findJamEvent).mockReset();
  vi.mocked(ensureLocalProfile).mockReset();
  vi.mocked(rejectFromWaitingRoom).mockReset();
  vi.mocked(rejectFromWaitingRoom).mockResolvedValue(undefined);
});

describe('POST /jams/:eventId/waiting-room/:profileId/reject', () => {
  it('returns 404 for an unknown jam', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(undefined);
    // Invoke the endpoint directly rather than through `call`: the helper
    // re-mocks `findJamEvent` to resolve the known jam, which would mask the
    // unknown-jam (404) path. The 404 is raised before local-profile auth,
    // so `ensureLocalProfile` is never reached.
    await expect(
      apiEndpoint.handle({
        body: {},
        query: {},
        param: { eventId: 'missing', profileId: 'guest1' },
        event: {},
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(rejectFromWaitingRoom).not.toHaveBeenCalled();
  });

  it('returns 401 when no local profile is authenticated', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(jamPost);
    vi.mocked(ensureLocalProfile).mockRejectedValue(authNeeded());
    // Invoke the endpoint directly: the `call` helper re-mocks
    // `ensureLocalProfile` to resolve, which would mask the 401.
    await expect(
      apiEndpoint.handle({
        body: {},
        query: {},
        param: { eventId: 'ev1', profileId: 'guest1' },
        event: {},
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(rejectFromWaitingRoom).not.toHaveBeenCalled();
  });

  it('returns 403 for a non-moderator and rejects nothing', async () => {
    await expect(
      call('guest1', 'ev1', { id: 'outsider' }),
    ).rejects.toMatchObject({
      status: 403,
    });
    expect(rejectFromWaitingRoom).not.toHaveBeenCalled();
  });

  it('rejects the waiting profile for a moderator', async () => {
    const res = await call('guest1', 'ev1', { id: 'mod-1' });
    expect(res).toEqual({ success: true });
    expect(rejectFromWaitingRoom).toHaveBeenCalledTimes(1);
    expect(rejectFromWaitingRoom).toHaveBeenCalledWith(
      jamPost,
      'guest1',
      undefined,
    );
  });

  it('forwards the parsed occurrence to the reject action', async () => {
    // A recurring jam is addressed by occurrence: the endpoint parses the
    // `occurrence` query param and forwards it to `rejectFromWaitingRoom`, so
    // a regression that drops the argument would reject the wrong room's
    // queue. Pin the round-trip through the real `parseOccurrenceQuery` (it
    // normalises the value to an ISO string) with an unmocked parse.
    const occurrence = '2026-11-20T12:00:00.000Z';
    const res = await call('guest1', 'ev1', { id: 'mod-1' }, { occurrence });
    expect(res).toEqual({ success: true });
    expect(rejectFromWaitingRoom).toHaveBeenCalledTimes(1);
    expect(rejectFromWaitingRoom).toHaveBeenCalledWith(
      jamPost,
      'guest1',
      occurrence,
    );
  });
});
