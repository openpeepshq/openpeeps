import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionEventSchema } from '@openpeepshq/common/types';

const redis = vi.hoisted(() => {
  type Listener = (message: string) => void;
  const listeners = new Map<string, Set<Listener>>();
  const hashes = new Map<string, Map<string, string>>();
  const sets = new Map<string, Set<string>>();

  const hash = (key: string) => {
    const existing = hashes.get(key);
    if (existing) return existing;
    const created = new Map<string, string>();
    hashes.set(key, created);
    return created;
  };

  const set = (key: string) => {
    const existing = sets.get(key);
    if (existing) return existing;
    const created = new Set<string>();
    sets.set(key, created);
    return created;
  };

  return {
    listeners,
    hashes,
    sets,
    reset: () => {
      listeners.clear();
      hashes.clear();
      sets.clear();
    },
    subscriber: {
      subscribe: async (channel: string, listener: Listener) => {
        const bucket = listeners.get(channel) ?? new Set<Listener>();
        bucket.add(listener);
        listeners.set(channel, bucket);
      },
    },
    shared: {
      publish: async (channel: string, message: string) => {
        for (const listener of listeners.get(channel) ?? []) {
          listener(message);
        }
        return 1;
      },
      hSet: async (key: string, field: string, value: string) => {
        hash(key).set(field, value);
        return 1;
      },
      expire: async () => true,
      sAdd: async (key: string, member: string) => {
        set(key).add(member);
        return 1;
      },
      hExists: async (key: string, field: string) => hash(key).has(field),
      hDel: async (key: string, field: string) => {
        hash(key).delete(field);
        return 1;
      },
      hLen: async (key: string) => hash(key).size,
      del: async (key: string) => {
        hashes.delete(key);
        return 1;
      },
      sRem: async (key: string, member: string) => {
        sets.get(key)?.delete(member);
        return 1;
      },
      hGetAll: async (key: string) => Object.fromEntries(hashes.get(key) ?? []),
      sMembers: async (key: string) => [...(sets.get(key) ?? [])],
    },
  };
});

const logError = vi.hoisted(() => vi.fn());

vi.mock('../redis/connection', () => ({
  getConnection: vi.fn(async () => redis.subscriber),
  getSharedConnection: vi.fn(async () => redis.shared),
  disconnect: vi.fn(async () => undefined),
}));

vi.mock('../log', () => ({
  logger: () => ({ error: logError }),
}));

import {
  getSessionPresence,
  listOnlineSessionPresence,
  publishSessionEvent,
  refreshSessionPresence,
  registerSessionPresence,
  subscribeToSessionEvents,
  unregisterSessionPresence,
} from './index';

const followPush = {
  title: 'alice followed you',
  options: { body: 'Hi', icon: '/avatar.png' },
  invalidateQueries: [['profiles']],
};

const stats = { unread: 2, unseen: 1 };

const invalidateEvent = {
  type: 'invalidate' as const,
  notification: followPush,
  notificationStats: stats,
};

describe('session SSE channel', () => {
  beforeEach(() => {
    redis.reset();
    logError.mockClear();
  });

  it('delivers a web-push invalidate envelope to that profile only', async () => {
    const received: unknown[] = [];
    const other: unknown[] = [];

    await subscribeToSessionEvents('profile-a', (event) => {
      received.push(event);
    });
    await subscribeToSessionEvents('profile-b', (event) => {
      other.push(event);
    });

    await publishSessionEvent('profile-a', invalidateEvent);

    expect(received).toEqual([invalidateEvent]);
    expect(other).toEqual([]);
    expect(sessionEventSchema.parse(received[0])).toEqual(invalidateEvent);
  });

  it('ignores malformed payloads without throwing', async () => {
    const received: unknown[] = [];
    await subscribeToSessionEvents('profile-a', (event) => {
      received.push(event);
    });

    await redis.shared.publish('session:events:profile:profile-a', 'not-json');

    expect(received).toEqual([]);
    expect(logError).toHaveBeenCalled();
  });
});

describe('session presence', () => {
  beforeEach(() => {
    redis.reset();
  });

  it('tracks platform per connection and lists online profiles', async () => {
    await registerSessionPresence({
      profileId: 'profile-a',
      connectionId: 'web-1',
      platform: 'web',
    });
    await registerSessionPresence({
      profileId: 'profile-a',
      connectionId: 'ios-1',
      platform: 'ios',
    });
    await registerSessionPresence({
      profileId: 'profile-b',
      connectionId: 'android-1',
      platform: 'android',
    });

    const presence = await getSessionPresence('profile-a');
    expect(presence?.profileId).toBe('profile-a');
    expect(presence?.platforms.sort()).toEqual(['ios', 'web']);
    expect(presence?.connections).toHaveLength(2);

    const online = await listOnlineSessionPresence();
    expect(online.map((entry) => entry.profileId).sort()).toEqual([
      'profile-a',
      'profile-b',
    ]);
  });

  it('stays online until the last connection unregisters', async () => {
    await registerSessionPresence({
      profileId: 'profile-a',
      connectionId: 'web-1',
      platform: 'web',
    });
    await registerSessionPresence({
      profileId: 'profile-a',
      connectionId: 'ios-1',
      platform: 'ios',
    });

    await unregisterSessionPresence('profile-a', 'web-1');
    expect(await getSessionPresence('profile-a')).toMatchObject({
      platforms: ['ios'],
    });

    await unregisterSessionPresence('profile-a', 'ios-1');
    expect(await getSessionPresence('profile-a')).toBeUndefined();
    expect(await listOnlineSessionPresence()).toEqual([]);
  });

  it('refresh is a no-op for an unknown connection', async () => {
    await refreshSessionPresence('profile-a', 'missing');
    expect(await getSessionPresence('profile-a')).toBeUndefined();
  });
});
