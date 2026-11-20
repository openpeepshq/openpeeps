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
    hDel: async (key: string, field: string) => {
      const hash = hashes.get(key);
      if (!hash || !(field in hash)) return 0;
      const next = { ...hash };
      delete next[field];
      hashes.set(key, next);
      return 1;
    },
    expire: async () => 1,
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
    const expires: Array<[string, number]> = [];
    redis.shared.expire = async (key: string, seconds: number) => {
      expires.push([key, seconds]);
      return 1;
    };

    await joinWaitingRoom(event, profile);
    await rejectFromWaitingRoom(event, profile.id);

    const denial = expires.find(([key]) => key === denialKey);
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
});
