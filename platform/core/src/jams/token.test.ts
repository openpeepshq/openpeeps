import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta, PublicProfile } from '@openpeepshq/common/types';
import { listRsvpOccurrences } from '@openpeepshq/common/lib';
import { findProfile } from '../profiles';
import { createJamToken } from './token';
import { config } from '../config';
import { createJamEvent } from './mutations';
import { localInstanceDomain } from './helpers';
import { roomService } from './livekit';

vi.mock('../config', () => ({ config: vi.fn() }));
vi.mock('../profiles', () => ({ findProfile: vi.fn() }));
vi.mock('./mutations', () => ({ createJamEvent: vi.fn() }));
vi.mock('./helpers', () => ({ localInstanceDomain: vi.fn() }));
const hub = vi.hoisted(() => ({ emit: vi.fn() }));
vi.mock('../events', () => ({ hub }));
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
  ({
    id,
    type: 'local',
    handle: 'jam-host',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    displayName: 'Jam Host',
  }) as unknown as PublicProfile;

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

describe('createJamToken start-event occurrence stamping', () => {
  // A recurring series and a one-off event, both opened by the host with no
  // occurrence in the query param (a re-open). `now` is frozen so the
  // "next upcoming occurrence" the fallback resolves is deterministic.
  const now = new Date('2026-11-26T00:00:00.000Z');
  const recurringEvent = (banned?: string[]): PostWithMeta =>
    ({
      id: JAM_ID,
      profile: { id: HOST_ID },
      data: {
        type: 'event',
        start: '2026-10-01T16:00:00.000Z',
        end: '2026-10-01T17:00:00.000Z',
        wholeDay: false,
        // 52 weeks keeps an upcoming occurrence in range regardless of the
        // frozen `now`.
        recurrence: { freq: 'WEEKLY', count: 52 },
        jam: {
          moderators: [HOST_ID],
          videoEnabled: true,
          type: 'video-call',
          ...(banned ? { banned } : {}),
        },
      },
    }) as unknown as PostWithMeta;
  const oneOffEvent = (): PostWithMeta =>
    ({
      id: JAM_ID,
      profile: { id: HOST_ID },
      data: {
        type: 'event',
        start: '2026-11-26T16:00:00.000Z',
        end: '2026-11-26T17:00:00.000Z',
        wholeDay: false,
        jam: {
          moderators: [HOST_ID],
          videoEnabled: true,
          type: 'video-call',
        },
      },
    }) as unknown as PostWithMeta;

  const openRoom = () =>
    vi.mocked(roomService).mockResolvedValue({
      listRooms: vi.fn().mockResolvedValue([]),
      createRoom: vi.fn().mockResolvedValue(undefined),
    } as never);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(findProfile).mockResolvedValue(undefined);
    vi.mocked(config).mockResolvedValue({
      jams: { livekit: { apiKey: 'ak', apiSecret: 'sk' } },
    } as never);
    vi.mocked(localInstanceDomain).mockResolvedValue('peeps.test');
    vi.mocked(createJamEvent).mockResolvedValue(undefined);
    openRoom();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('stamps a re-opened recurring jam with the next upcoming occurrence', async () => {
    // No occurrence in the query param → the fallback is
    // listRsvpOccurrences(event, now)[0], the next upcoming occurrence.
    const expected = listRsvpOccurrences(recurringEvent().data as never, now)[0]
      ?.recurrenceId;
    expect(expected).toBeDefined();

    await createJamToken(recurringEvent(), profile(HOST_ID));

    expect(createJamEvent).toHaveBeenCalledTimes(1);
    const written = vi.mocked(createJamEvent).mock.calls[0][0];
    expect(written.type).toBe('start');
    expect(written.recurrenceId).toBe(expected);
  });

  it('emits jamStarted with the same occurrence the start row carries', async () => {
    const expected = listRsvpOccurrences(recurringEvent().data as never, now)[0]
      ?.recurrenceId;

    await createJamToken(recurringEvent(), profile(HOST_ID));

    expect(hub.emit).toHaveBeenCalledTimes(1);
    const emitArgs = vi.mocked(hub.emit).mock.calls[0];
    expect(emitArgs[0]).toBe('jamStarted');
    // One resolution feeds both: the notification must carry the same
    // occurrence id the persisted start event was stamped with, so a
    // divergence in the two code paths fails this test.
    expect(emitArgs[3]).toBe(expected);
    expect(vi.mocked(createJamEvent).mock.calls[0][0].recurrenceId).toBe(
      expected,
    );
  });

  it('stamps a re-opened one-off jam with the raw room key', async () => {
    const key = '2026-11-26T16:00:00.000Z';
    await createJamToken(oneOffEvent(), profile(HOST_ID), {
      recurrenceId: key,
    });

    expect(createJamEvent).toHaveBeenCalledTimes(1);
    const written = vi.mocked(createJamEvent).mock.calls[0][0];
    expect(written.type).toBe('start');
    // One-off jams have no schedule to resolve, so the raw param stands in.
    expect(written.recurrenceId).toBe(key);
    // …and the notification omits it: the raw room key is not an occurrence,
    // so the emit's third argument stays undefined while the row keeps it.
    expect(hub.emit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(hub.emit).mock.calls[0][3]).toBeUndefined();
  });
});
