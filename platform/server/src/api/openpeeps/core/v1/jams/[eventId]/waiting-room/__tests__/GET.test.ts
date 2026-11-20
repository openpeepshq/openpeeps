import { describe, expect, it, vi } from 'vitest';
import {
  jamWaitingRoomEntrySchema,
  publicProfileSchema,
  type JamWaitingRoomEntry,
  type PostWithMeta,
} from '@openpeepshq/common/types';
import { currentWaitingRoomWatch, findJamEvent } from '@openpeepshq/core/jams';
import { ensureLocalProfile } from '#lib/auth';
import { Stream, apiEndpoint } from '../GET';

vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(),
}));

vi.mock('@openpeepshq/core/jams', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/core/jams')>();
  return {
    ...actual,
    findJamEvent: vi.fn(),
    currentWaitingRoomWatch: vi.fn(),
  };
});

// The moderation stream is display-only by contract (realtime.md, "Jam
// waiting room"): `currentWaitingRoom` re-parses every Redis value through
// `jamWaitingRoomEntrySchema`, and `joinWaitingRoom` stores only
// `{ displayName }` keyed by profile id. These tests pin the endpoint's
// declared `Stream` schema to exactly that payload so a future change that
// re-advertises full profiles in the OpenAPI contract fails here instead of
// silently drifting from what the server actually emits.
describe('waiting-room GET Stream schema', () => {
  const profileId = 'a0000000-0000-4000-8000-000000000000';

  it('accepts exactly what currentWaitingRoom returns', () => {
    // What joinWaitingRoom stores and currentWaitingRoom re-parses.
    const stored = [
      [profileId, JSON.stringify({ displayName: 'Ada Guest' })],
      ['b0000000-0000-4000-8000-000000000000', '{}'],
    ] as const;
    const snapshot = Object.fromEntries(
      stored.map(([key, raw]) => [
        key,
        jamWaitingRoomEntrySchema.parse(JSON.parse(raw)),
      ]),
    ) as Record<string, JamWaitingRoomEntry>;

    expect(Stream.safeParse(snapshot).success).toBe(true);
  });

  it('rejects a fabricated full-profile entry', () => {
    const fullProfile = publicProfileSchema.parse({
      id: profileId,
      type: 'guest',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      handle: 'ada',
      bio: '',
    });

    expect(Stream.safeParse({ [profileId]: fullProfile }).success).toBe(false);
    // The display-only subset of that same profile is the real contract.
    expect(
      Stream.safeParse({
        [profileId]: { displayName: fullProfile.displayName },
      }).success,
    ).toBe(true);
  });
});

describe('waiting-room GET endpoint gates', () => {
  const jamEvent = {
    id: 'jamevent',
    data: { type: 'event', jam: { moderators: ['moderator'] } },
  } as never as PostWithMeta;

  const handle = () =>
    apiEndpoint.handle({
      body: {},
      query: {},
      param: { eventId: 'jamevent' },
      event: {},
    } as never);

  it('returns 404 for an unknown jam', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(undefined);
    vi.mocked(ensureLocalProfile).mockResolvedValue({
      id: 'moderator',
    } as never);

    await expect(handle()).rejects.toMatchObject({ status: 404 });
    expect(findJamEvent).toHaveBeenCalledWith('jamevent');
    expect(currentWaitingRoomWatch).not.toHaveBeenCalled();
  });

  it('returns 403 for a non-moderator', async () => {
    vi.mocked(findJamEvent).mockResolvedValue(jamEvent);
    vi.mocked(ensureLocalProfile).mockResolvedValue({
      id: 'outsider',
    } as never);

    await expect(handle()).rejects.toMatchObject({ status: 403 });
    expect(currentWaitingRoomWatch).not.toHaveBeenCalled();
  });

  it('opens the moderation stream for a moderator', async () => {
    vi.mocked(currentWaitingRoomWatch).mockResolvedValue(vi.fn());
    vi.mocked(findJamEvent).mockResolvedValue(jamEvent);
    vi.mocked(ensureLocalProfile).mockResolvedValue({
      id: 'moderator',
    } as never);

    await handle();
    expect(currentWaitingRoomWatch).toHaveBeenCalledWith(
      jamEvent,
      expect.any(Function),
      undefined,
    );
  });
});
