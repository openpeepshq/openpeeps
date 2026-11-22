import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  jamWaitingRoomEntrySchema,
  type PostWithMeta,
  type PublicProfile,
} from '@openpeepshq/common/types';

// In-memory redis, matching the pattern in session.test.ts. `disconnect`
// throws on a double-close so a watch that disconnects its subscriber twice
// (the pre-fix cleanup regression) fails the watched-then-settled tests.
const redis = vi.hoisted(() => {
  const hashes = new Map<string, Record<string, string>>();
  const disconnected: string[] = [];
  const expireCalls: Array<[string, number]> = [];
  const subscriber = {
    isOpen: true,
    subscribe: async () => undefined,
  };
  const shared = {
    hSet: async (
      key: string,
      fieldOrObj: string | Record<string, string>,
      value?: string,
    ) => {
      const existing = hashes.get(key) ?? {};
      if (typeof fieldOrObj === 'string') {
        existing[fieldOrObj] = value as string;
      } else {
        for (const [f, v] of Object.entries(fieldOrObj)) {
          existing[f] = String(v);
        }
      }
      hashes.set(key, existing);
      return 1;
    },
    hGet: async (key: string, field: string) =>
      hashes.get(key)?.[field] ?? null,
    hGetAll: async (key: string) => ({ ...(hashes.get(key) ?? {}) }),
    hExists: async (key: string, field: string) =>
      Boolean(hashes.get(key)?.[field]),
    hDel: async (key: string, ...fields: (string | string[])[]) => {
      const flat = fields.flat();
      const hash = hashes.get(key);
      if (!hash) return 0;
      const next = { ...hash };
      for (const field of flat) delete next[field];
      hashes.set(key, next);
      return flat.length;
    },
    expire: async (key: string, seconds: number) => {
      expireCalls.push([key, seconds]);
      return 1;
    },
    del: async (key: string) => {
      hashes.delete(key);
      return 1;
    },
  };
  return {
    hashes,
    shared,
    subscriber,
    disconnected,
    expireCalls,
    reset: () => hashes.clear(),
  };
});

vi.mock('../redis/connection', () => ({
  getConnection: vi.fn(async () => redis.subscriber),
  getSharedConnection: vi.fn(async () => redis.shared),
  disconnect: vi.fn(async (c: { isOpen: boolean }) => {
    if (!c.isOpen) throw new Error('disconnect on a closed connection');
    c.isOpen = false;
    redis.disconnected.push('closed');
  }),
}));

vi.mock('./token', () => ({
  assertJamRsvpAllowed: vi.fn(),
  createJamToken: vi.fn(async () => 'FAKE_JAM_TOKEN'),
}));

vi.mock('../profiles', () => ({ getProfile: vi.fn() }));

import {
  ADMITTANCE_FALLBACK_POLL_MS,
  ADMITTANCE_FALLBACK_POLLS,
  DENIAL_TTL_SEC,
  acceptFromWaitingRoom,
  admittanceWatch,
  clearJamAdmittance,
  joinWaitingRoom,
  rejectFromWaitingRoom,
} from './waitingRoom';
import { createJamToken, assertJamRsvpAllowed } from './token';
import { getProfile } from '../profiles';

const event = {
  id: 'ev1',
  profile: { id: 'host', handle: 'host', type: 'local', memberships: [] },
  data: {
    type: 'event',
    name: 'Test event',
    startDate: '2026-01-01T00:00:00Z',
    location: 'Somewhere',
    maxAttendees: undefined,
    audience: 'everyone',
    jam: { id: 'jam1', waitingRoom: true, moderators: ['host'] },
  },
} as unknown as PostWithMeta;

const guest: PublicProfile = {
  id: 'guest1',
  type: 'guest',
  handle: 'guest-abc',
  displayName: 'Ada Guest',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  memberships: [],
} as unknown as PublicProfile;

beforeEach(() => {
  redis.reset();
  redis.disconnected.length = 0;
  redis.expireCalls.length = 0;
  redis.subscriber.isOpen = true;
  redis.subscriber.subscribe = async () => undefined;
  vi.mocked(createJamToken).mockReset();
  vi.mocked(createJamToken).mockResolvedValue('FAKE_JAM_TOKEN');
  vi.mocked(assertJamRsvpAllowed).mockReset();
  vi.mocked(getProfile).mockReset();
});

describe('joinWaitingRoom', () => {
  it('stores only { displayName } keyed by profile id, not the full profile', async () => {
    await joinWaitingRoom(event, guest);
    const stored = await redis.shared.hGetAll('jams:waiting-room:ev1');
    expect(stored).toEqual({
      guest1: JSON.stringify({ displayName: 'Ada Guest' }),
    });
    // The full profile object (id/type/guestData) must not round-trip.
    expect(stored.guest1).not.toContain('guest-abc');
    expect(stored.guest1).not.toContain('"type"');
  });

  it('falls back to handle when displayName is missing', async () => {
    const noName = {
      id: 'g2',
      handle: 'plain-guest',
      displayName: undefined,
      type: 'guest',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      memberships: [],
    } as unknown as PublicProfile;
    await joinWaitingRoom(event, noName);
    const stored = await redis.shared.hGetAll('jams:waiting-room:ev1');
    expect(JSON.parse(stored.g2)).toEqual({ displayName: 'plain-guest' });
  });

  it('refuses a banned (removed) profile up front with error.jamBanned', async () => {
    const bannedEvent = {
      ...event,
      data: {
        ...(event.data as object),
        jam: { ...(event.data?.jam as object), banned: ['guest1'] },
      },
    } as unknown as PostWithMeta;
    await expect(joinWaitingRoom(bannedEvent, guest)).rejects.toMatchObject({
      errorKey: 'error.jamBanned',
    });
    // The profile must not have been queued: no waiting-room entry is written.
    const stored = await redis.shared.hGetAll('jams:waiting-room:ev1');
    expect(stored).toEqual({});
  });

  it('still queues a profile that is not in the ban list', async () => {
    const bannedEvent = {
      ...event,
      data: {
        ...(event.data as object),
        jam: { ...(event.data?.jam as object), banned: ['someone-else'] },
      },
    } as unknown as PostWithMeta;
    await joinWaitingRoom(bannedEvent, guest);
    const stored = await redis.shared.hGetAll('jams:waiting-room:ev1');
    expect(stored).toEqual({
      guest1: JSON.stringify({ displayName: 'Ada Guest' }),
    });
  });
});

describe('acceptFromWaitingRoom', () => {
  it('re-fetches the profile by id and mints a token via createJamToken', async () => {
    await joinWaitingRoom(event, guest);
    vi.mocked(getProfile).mockResolvedValue(guest);
    const result = await acceptFromWaitingRoom(event, 'guest1');
    expect(result).toBeUndefined();
    // Token minted with the re-fetched profile, stored under the admittance key.
    expect(createJamToken).toHaveBeenCalledWith(
      event,
      guest,
      expect.objectContaining({ recurrenceId: undefined }),
    );
    const admittance = await redis.shared.hGetAll('jams:admitted:ev1');
    expect(admittance.guest1).toBe('FAKE_JAM_TOKEN');
    // The original queue entry is consumed.
    const wr = await redis.shared.hGetAll('jams:waiting-room:ev1');
    expect(wr).toEqual({});
  });

  it('refuses admission when the profile can no longer be fetched', async () => {
    await joinWaitingRoom(event, guest);
    vi.mocked(getProfile).mockResolvedValue(undefined);
    const result = await acceptFromWaitingRoom(event, 'guest1');
    expect(result).toBeUndefined();
    expect(createJamToken).not.toHaveBeenCalled();
    const admittance = await redis.shared.hGetAll('jams:admitted:ev1');
    expect(admittance).toEqual({});
    // The queue entry is consumed either way — no zombie slot remains.
    const wr = await redis.shared.hGetAll('jams:waiting-room:ev1');
    expect(wr).toEqual({});
  });
});

describe('clearJamAdmittance', () => {
  it('removes only the named profile from the admittance hash', async () => {
    await joinWaitingRoom(event, guest);
    vi.mocked(getProfile).mockResolvedValue(guest);
    await acceptFromWaitingRoom(event, 'guest1');
    const before = await redis.shared.hGetAll('jams:admitted:ev1');
    expect(Object.keys(before)).toEqual(['guest1']);
    await clearJamAdmittance(event, undefined, ['guest1']);
    expect(await redis.shared.hGetAll('jams:admitted:ev1')).toEqual({});
  });

  it('is a no-op for an empty id set (never wipes the whole hash)', async () => {
    await joinWaitingRoom(event, guest);
    vi.mocked(getProfile).mockResolvedValue(guest);
    await acceptFromWaitingRoom(event, 'guest1');
    const before = await redis.shared.hGetAll('jams:admitted:ev1');
    expect(Object.keys(before)).toEqual(['guest1']);
    // An explicit empty set must not fall through to del() — that would clear
    // every pending admittee in the room, not just the (absent) banned one.
    await clearJamAdmittance(event, undefined, []);
    expect(await redis.shared.hGetAll('jams:admitted:ev1')).toEqual(before);
  });

  it('wipes the whole admittance hash when no id set is given', async () => {
    await joinWaitingRoom(event, guest);
    vi.mocked(getProfile).mockResolvedValue(guest);
    await acceptFromWaitingRoom(event, 'guest1');
    const before = await redis.shared.hGetAll('jams:admitted:ev1');
    expect(Object.keys(before)).toEqual(['guest1']);
    await clearJamAdmittance(event);
    expect(await redis.shared.hGetAll('jams:admitted:ev1')).toEqual({});
  });
});

describe('waiting-room entry contract (shared schema)', () => {
  it('parses an id-less entry (displayName only) and strips unknown fields', () => {
    expect(
      jamWaitingRoomEntrySchema.parse({ displayName: 'Ada Guest' }),
    ).toEqual({ displayName: 'Ada Guest' });
    expect(jamWaitingRoomEntrySchema.parse({})).toEqual({});
    expect(
      jamWaitingRoomEntrySchema.parse({
        displayName: 'Ada',
        guestData: { foo: 'bar' },
        id: 'p1',
      }),
    ).toEqual({ displayName: 'Ada' });
  });
});

describe('waiting room rejection', () => {
  const profile: PublicProfile = {
    id: 'member-1',
    displayName: 'Member',
  } as unknown as PublicProfile;
  const waitingKey = 'jams:waiting-room:ev1';
  const denialKey = 'jams:denied:ev1';
  const admittedKey = 'jams:admitted:ev1';

  it('removes the profile from the waiting room and marks them denied', async () => {
    await joinWaitingRoom(event, profile);

    await rejectFromWaitingRoom(event, profile.id);

    expect(redis.hashes.get(waitingKey)?.[profile.id]).toBeUndefined();
    expect(redis.hashes.get(denialKey)?.[profile.id]).toBe('1');
  });

  it('lets a rejected profile request again', async () => {
    await joinWaitingRoom(event, profile);
    await rejectFromWaitingRoom(event, profile.id);

    await joinWaitingRoom(event, profile);

    expect(redis.hashes.get(denialKey)?.[profile.id]).toBeUndefined();
    expect(
      JSON.parse(redis.hashes.get(waitingKey)?.[profile.id] ?? ''),
    ).toEqual({ displayName: 'Member' });
  });

  it('keeps an admitted profile admitted when they re-join', async () => {
    // The reconnect path: an admitted guest (e.g. after a mobile idle
    // disconnect) hits the join endpoint again. The new request must clear
    // a prior denial but never the admittance — a second moderator
    // approval would strand the reconnect behind the waiting room.
    redis.hashes.set(admittedKey, { [profile.id]: 'token' });
    redis.hashes.set(denialKey, { [profile.id]: '1' });

    await joinWaitingRoom(event, profile);

    expect(redis.hashes.get(admittedKey)?.[profile.id]).toBe('token');
    expect(redis.hashes.get(denialKey)?.[profile.id]).toBeUndefined();
    // The re-join still queued the guest, so the moderation stream shows
    // them while the reconnect is in flight.
    expect(redis.hashes.get(waitingKey)?.[profile.id]).toBeDefined();
  });

  it('clears denials when the jam admission state is cleared', async () => {
    redis.hashes.set(admittedKey, { [profile.id]: 'token' });
    redis.hashes.set(denialKey, { [profile.id]: '1' });

    await clearJamAdmittance(event);

    expect(redis.hashes.has(admittedKey)).toBe(false);
    expect(redis.hashes.has(denialKey)).toBe(false);
  });

  it('expires the denial key quickly instead of keeping it for 12h', async () => {
    await joinWaitingRoom(event, profile);
    await rejectFromWaitingRoom(event, profile.id);

    const denial = redis.expireCalls.find(([key]) => key === denialKey);
    expect(denial).toBeDefined();
    // The pre-fix code kept the denial hash for the 12h admittance TTL;
    // asserting the exact value catches both that and an over-long replacement.
    expect(denial?.[1]).toBe(DENIAL_TTL_SEC);
  });
});

describe('admittanceWatch denied emission', () => {
  const profileId = 'member-1';
  const denialKey = 'jams:denied:ev1';

  it('emits denied when the watch is already decided for a denied profile', async () => {
    redis.hashes.set(denialKey, { [profileId]: '1' });

    const cleanup = await admittanceWatch(
      event,
      profileId,
      () => {
        throw new Error('onToken must not fire for a denied profile');
      },
      undefined,
      async () => {},
    );

    // The decision was made before any keyspace event was watched, so nothing
    // was closed while watching. The cleanup closes the still-open subscriber
    // exactly once.
    expect(redis.disconnected).toEqual([]);
    await cleanup();
    expect(redis.disconnected).toEqual(['closed']);
  });

  it('emits denied on the denial keyspace event while watching', async () => {
    let denyHandler: ((event: string) => Promise<void>) | undefined;
    redis.subscriber.subscribe = async (
      channel: string,
      handler: (event: string) => Promise<void>,
    ) => {
      if (channel.includes(denialKey)) denyHandler = handler;
    };

    const onToken = vi.fn();
    const onDenied = vi.fn();
    const cleanupPromise = admittanceWatch(
      event,
      profileId,
      onToken,
      undefined,
      onDenied,
    );
    const cleanup = await cleanupPromise;

    redis.hashes.set(denialKey, { [profileId]: '1' });
    await denyHandler?.('hset');

    expect(onDenied).toHaveBeenCalledTimes(1);
    expect(onToken).not.toHaveBeenCalled();
    expect(redis.disconnected).toEqual(['closed']);
    await cleanup();
  });

  it('settles on the denial via the fallback poll when no keyspace event arrives', async () => {
    vi.useFakeTimers();
    try {
      const onDenied = vi.fn();
      const cleanupPromise = admittanceWatch(
        event,
        profileId,
        vi.fn(),
        undefined,
        onDenied,
      );
      const cleanup = await cleanupPromise;

      // The denial lands while no keyspace event is delivered (a missed
      // event, or a Redis without notify-keyspace-events): the bounded
      // fallback poll must still settle the watch.
      redis.hashes.set(denialKey, { [profileId]: '1' });
      await vi.advanceTimersByTimeAsync(ADMITTANCE_FALLBACK_POLL_MS);

      expect(onDenied).toHaveBeenCalledTimes(1);
      expect(redis.disconnected).toEqual(['closed']);
      await cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops the fallback poll after the window but keeps watching for keyspace events', async () => {
    vi.useFakeTimers();
    try {
      let denyHandler: ((event: string) => Promise<void>) | undefined;
      redis.subscriber.subscribe = async (
        channel: string,
        handler: (event: string) => Promise<void>,
      ) => {
        if (channel.includes(denialKey)) denyHandler = handler;
      };

      const onDenied = vi.fn();
      const cleanup = await admittanceWatch(
        event,
        profileId,
        vi.fn(),
        undefined,
        onDenied,
      );

      // The window elapses with no decision: the poll stops, the watch stays
      // open, and nothing is settled.
      await vi.advanceTimersByTimeAsync(
        (ADMITTANCE_FALLBACK_POLLS + 1) * ADMITTANCE_FALLBACK_POLL_MS,
      );
      expect(onDenied).not.toHaveBeenCalled();
      expect(redis.disconnected).toEqual([]);

      // A keyspace event outside the window still settles the watch.
      redis.hashes.set(denialKey, { [profileId]: '1' });
      await denyHandler?.('hset');
      expect(onDenied).toHaveBeenCalledTimes(1);
      expect(redis.disconnected).toEqual(['closed']);
      await cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  // Symmetric coverage for the admittance path: the same `notifyIfDecided` /
  // settled-once / cleanup rewrite is exercised by the denial cases above,
  // but a guest who gets admitted takes the token branch — a missed event
  // must not strand them either.
  it('emits the token on the admittance keyspace event while watching', async () => {
    const admittedKey = 'jams:admitted:ev1';
    let admitHandler: ((event: string) => Promise<void>) | undefined;
    redis.subscriber.subscribe = async (
      channel: string,
      handler: (event: string) => Promise<void>,
    ) => {
      if (channel.includes(admittedKey)) admitHandler = handler;
    };

    const onToken = vi.fn();
    const onDenied = vi.fn();
    const cleanup = await admittanceWatch(
      event,
      profileId,
      onToken,
      undefined,
      onDenied,
    );

    redis.hashes.set(admittedKey, { [profileId]: 'TOKEN' });
    await admitHandler?.('hset');

    expect(onToken).toHaveBeenCalledWith('TOKEN');
    expect(onDenied).not.toHaveBeenCalled();
    // Settling closed the subscriber once; the settle-once guard means the
    // cleanup must not disconnect the already-closed connection again.
    expect(redis.disconnected).toEqual(['closed']);
    await cleanup();
    expect(redis.disconnected).toEqual(['closed']);
  });

  it('settles on the token via the fallback poll when no keyspace event arrives', async () => {
    vi.useFakeTimers();
    try {
      const admittedKey = 'jams:admitted:ev1';
      const onToken = vi.fn();
      const onDenied = vi.fn();
      const cleanup = await admittanceWatch(
        event,
        profileId,
        onToken,
        undefined,
        onDenied,
      );

      // The admission lands while no keyspace event is delivered: the
      // bounded fallback poll must still deliver the token.
      redis.hashes.set(admittedKey, { [profileId]: 'TOKEN' });
      await vi.advanceTimersByTimeAsync(ADMITTANCE_FALLBACK_POLL_MS);

      expect(onToken).toHaveBeenCalledWith('TOKEN');
      expect(onDenied).not.toHaveBeenCalled();
      expect(redis.disconnected).toEqual(['closed']);
      await cleanup();
      expect(redis.disconnected).toEqual(['closed']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('settles the decision exactly once when a keyspace event lands while a fallback poll tick is in flight', async () => {
    const originalHGet = redis.shared.hGet;
    vi.useFakeTimers();
    try {
      const admittedKey = 'jams:admitted:ev1';
      let eventHandler: ((event: string) => Promise<void>) | undefined;
      redis.subscriber.subscribe = async (
        channel: string,
        handler: (event: string) => Promise<void>,
      ) => {
        if (channel.includes(admittedKey)) eventHandler = handler;
      };

      // Hold every decision read open until two notifyIfDecided calls are
      // concurrently suspended on it: the event handler's tick and the
      // fallback poll's tick, both past the settled guard at entry. That is
      // the double-fire race the guard must settle once on.
      let decisionReads = 0;
      let releaseReads: () => void = () => {};
      const readsReleased = new Promise<void>((r) => {
        releaseReads = r;
      });
      redis.shared.hGet = async (key: string, field: string) => {
        const value = await originalHGet(key, field);
        if (value) {
          if (++decisionReads >= 2) releaseReads();
          await readsReleased;
        }
        return value;
      };

      const onToken = vi.fn();
      const onDenied = vi.fn();
      const cleanup = await admittanceWatch(
        event,
        profileId,
        onToken,
        undefined,
        onDenied,
      );

      redis.hashes.set(admittedKey, { [profileId]: 'TOKEN' });
      // The keyspace event starts its notifyIfDecided and suspends on the
      // decision read…
      const eventDone = eventHandler?.('hset');
      // …the next fallback poll tick starts a second one while the first is
      // still in flight; releasing the reads resumes both.
      await vi.advanceTimersByTimeAsync(ADMITTANCE_FALLBACK_POLL_MS);
      await eventDone;

      expect(onToken).toHaveBeenCalledTimes(1);
      expect(onToken).toHaveBeenCalledWith('TOKEN');
      expect(onDenied).not.toHaveBeenCalled();
      expect(redis.disconnected).toEqual(['closed']);
      await cleanup();
      expect(redis.disconnected).toEqual(['closed']);
    } finally {
      redis.shared.hGet = originalHGet;
      vi.useRealTimers();
    }
  });

  it('skips a decision that lands while the first wake-up callback is still in flight (settled is set before the await)', async () => {
    vi.useFakeTimers();
    try {
      const admittedKey = 'jams:admitted:ev1';

      // Both wake-ups are driven by the bounded fallback poll (no keyspace
      // event), so the first tick settles the watch and the second tick is a
      // pure re-check — deterministic under fake timers, unlike a keyspace
      // event that can race the subscriber's `subscribe` call.
      //
      // The first tick sets `settled` synchronously *before* awaiting
      // onToken, so it suspends in the (held-open) callback. The second tick
      // then lands while the first callback is still in flight: with the
      // pre-await `settled = true` in place it hits the entry guard and is
      // skipped (the hash has no "already settled" marker to re-read), not
      // queued for delivery. Dropping that pre-await `settled = true` would
      // let the second tick re-read the still-present token and fire
      // onToken a second time.
      let resolveOnToken: () => void = () => {};
      const onTokenInFlight = new Promise<void>((r) => {
        resolveOnToken = r;
      });
      const onToken = vi.fn(() => onTokenInFlight);
      const onDenied = vi.fn();
      const cleanup = await admittanceWatch(
        event,
        profileId,
        onToken,
        undefined,
        onDenied,
      );

      redis.hashes.set(admittedKey, { [profileId]: 'TOKEN' });
      // First poll tick: settles the watch and suspends in onToken…
      await vi.advanceTimersByTimeAsync(ADMITTANCE_FALLBACK_POLL_MS);
      expect(onToken).toHaveBeenCalledTimes(1);
      expect(onToken).toHaveBeenCalledWith('TOKEN');
      expect(onDenied).not.toHaveBeenCalled();

      // …second poll tick lands while the first callback is still in flight.
      await vi.advanceTimersByTimeAsync(ADMITTANCE_FALLBACK_POLL_MS);
      expect(onToken).toHaveBeenCalledTimes(1);
      expect(onDenied).not.toHaveBeenCalled();

      // Releasing the first callback settles the watch once; the second
      // wake-up was skipped, not delivered.
      resolveOnToken();
      await vi.advanceTimersByTimeAsync(ADMITTANCE_FALLBACK_POLL_MS);
      expect(onToken).toHaveBeenCalledTimes(1);
      expect(onDenied).not.toHaveBeenCalled();
      expect(redis.disconnected).toEqual(['closed']);
      await cleanup();
      expect(redis.disconnected).toEqual(['closed']);
    } finally {
      vi.useRealTimers();
    }
  });
});
