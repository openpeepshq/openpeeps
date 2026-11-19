import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta, PublicProfile } from '@openpeepshq/common/types';
import { findProfile } from '../profiles';
import { createJamToken } from './token';
import { roomService } from './livekit';

vi.mock('../config', () => ({ config: vi.fn() }));
vi.mock('../profiles', () => ({ findProfile: vi.fn() }));
// Room service resolves undefined so a token that gets past the ban gate fails
// later at `error.jamsUnavailable` — a distinct sentinel from `error.jamBanned`.
vi.mock('./livekit', () => ({
  roomService: vi.fn().mockResolvedValue(undefined),
  JAM_ROOM_EMPTY_TIMEOUT_SEC: 300,
  JAM_ROOM_DEPARTURE_TIMEOUT_SEC: 60,
}));

const JAM_ID = '01970000-0000-7000-8000-000000000001';
const HOST_ID = '01970000-0000-7000-8000-000000000002';
const MEMBER_ID = '01970000-0000-7000-8000-000000000003';
const BANNED_ID = '01970000-0000-7000-8000-000000000004';

const jamEvent = (banned?: string[]): PostWithMeta =>
  ({
    id: JAM_ID,
    profile: { id: HOST_ID },
    data: {
      type: 'event',
      jam: {
        moderators: [HOST_ID],
        videoEnabled: true,
        type: 'video-call',
        ...(banned ? { banned } : {}),
      },
    },
  }) as unknown as PostWithMeta;

const profile = (id: string): PublicProfile =>
  ({ id, handle: id, displayName: id }) as unknown as PublicProfile;

describe('createJamToken ban enforcement', () => {
  afterEach(() => {
    vi.mocked(findProfile).mockResolvedValue(undefined);
    vi.mocked(roomService).mockResolvedValue(undefined);
    vi.restoreAllMocks();
  });

  it('403s a profile that is on the jam ban list', async () => {
    await expect(
      createJamToken(jamEvent([BANNED_ID, MEMBER_ID]), profile(BANNED_ID)),
    ).rejects.toMatchObject({ code: 403, errorKey: 'error.jamBanned' });
    // Rejected at the ban gate, before reaching LiveKit.
    expect(roomService).not.toHaveBeenCalled();
  });

  it('lets a profile that was lifted off the ban list re-token', async () => {
    // Banned no longer contains BANNED_ID → passes the gate and fails only at
    // the (unavailable, mocked) room service.
    await expect(
      createJamToken(jamEvent([MEMBER_ID]), profile(BANNED_ID)),
    ).rejects.toMatchObject({ errorKey: 'error.jamsUnavailable' });
  });

  it('lets other members in while someone else is banned', async () => {
    await expect(
      createJamToken(jamEvent([BANNED_ID]), profile(MEMBER_ID)),
    ).rejects.toMatchObject({ errorKey: 'error.jamsUnavailable' });
  });
});
