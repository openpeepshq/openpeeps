import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  jamWaitingRoomEntrySchema,
  type PostWithMeta,
  type PublicProfile,
} from '@openpeepshq/common/types';

// In-memory redis, matching the pattern in session.test.ts.
const redis = vi.hoisted(() => {
  const hashes = new Map<string, Map<string, string>>();
  const hash = (key: string) => {
    const existing = hashes.get(key);
    if (existing) return existing;
    const created = new Map<string, string>();
    hashes.set(key, created);
    return created;
  };
  return {
    hashes,
    reset: () => hashes.clear(),
    subscriber: { subscribe: async () => () => {} },
    shared: {
      hSet: async (
        key: string,
        fieldOrObj: string | Record<string, string>,
        value?: string,
      ) => {
        if (typeof fieldOrObj === 'string') {
          hash(key).set(fieldOrObj, value as string);
        } else {
          for (const [f, v] of Object.entries(fieldOrObj)) {
            hash(key).set(f, String(v));
          }
        }
        return 1;
      },
      hGet: async (key: string, field: string) => hash(key).get(field) ?? null,
      hGetAll: async (key: string) => Object.fromEntries(hashes.get(key) ?? []),
      hExists: async (key: string, field: string) => hash(key).has(field),
      hDel: async (key: string, ...fields: (string | string[])[]) => {
        const flat = fields.flat();
        for (const field of flat) hash(key).delete(field);
        return flat.length;
      },
      expire: async () => true,
      del: async (key: string) => {
        hashes.delete(key);
        return 1;
      },
    },
  };
});

vi.mock('../redis/connection', () => ({
  getConnection: vi.fn(async () => redis.subscriber),
  getSharedConnection: vi.fn(async () => redis.shared),
  disconnect: vi.fn(async () => undefined),
}));

vi.mock('./token', () => ({
  assertJamRsvpAllowed: vi.fn(),
  createJamToken: vi.fn(async () => 'FAKE_JAM_TOKEN'),
}));

vi.mock('../profiles', () => ({
  getProfile: vi.fn(),
}));

import {
  acceptFromWaitingRoom,
  clearJamAdmittance,
  joinWaitingRoom,
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
    // The queue stores exactly this shape keyed by profile id. The moderation
    // stream re-serialises through the same record, so id/type/guestData never
    // round-trip — the schema strips anything but `displayName`, so the full
    // profile object (incl. guestData) can never leak through the queue.
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
