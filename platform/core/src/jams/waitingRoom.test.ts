import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta, PublicProfile } from '@openpeepshq/common/types';

const { hashes, conn } = vi.hoisted(() => {
  const hashes = new Map<string, Record<string, string>>();
  const conn = {
    hGetAll: async (key: string) => ({ ...(hashes.get(key) ?? {}) }),
    hGet: async (key: string, field: string) => hashes.get(key)?.[field],
    hExists: async (key: string, field: string) =>
      Boolean(hashes.get(key)?.[field]),
    hSet: async (key: string, value: Record<string, string>) => {
      hashes.set(key, { ...(hashes.get(key) ?? {}), ...value });
      return Object.keys(value).length;
    },
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
  return { hashes, conn };
});

vi.mock('../redis/connection', () => ({
  getSharedConnection: vi.fn(async () => conn),
  getConnection: vi.fn(async () => ({
    subscribe: async () => undefined,
    disconnect: async () => undefined,
  })),
  disconnect: vi.fn(),
}));

import {
  clearJamAdmittance,
  joinWaitingRoom,
  rejectFromWaitingRoom,
} from './waitingRoom';

const event = {
  id: 'jam-1',
  data: { type: 'event', jam: { waitingRoom: true } },
} as PostWithMeta;

const profile = {
  id: 'member-1',
  displayName: 'Member',
} as PublicProfile;

const waitingKey = 'jams:waiting-room:jam-1';
const denialKey = 'jams:denied:jam-1';
const admittedKey = 'jams:admitted:jam-1';

describe('waiting room rejection', () => {
  beforeEach(() => {
    hashes.clear();
  });

  it('removes the profile from the waiting room and marks them denied', async () => {
    await joinWaitingRoom(event, profile);

    await rejectFromWaitingRoom(event, profile.id);

    expect(hashes.get(waitingKey)?.[profile.id]).toBeUndefined();
    expect(hashes.get(denialKey)?.[profile.id]).toBe('1');
  });

  it('lets a rejected profile request again', async () => {
    await joinWaitingRoom(event, profile);
    await rejectFromWaitingRoom(event, profile.id);

    await joinWaitingRoom(event, profile);

    expect(hashes.get(denialKey)?.[profile.id]).toBeUndefined();
    expect(hashes.get(waitingKey)?.[profile.id]).toContain(profile.id);
  });

  it('clears denials when the jam admission state is cleared', async () => {
    hashes.set(admittedKey, { [profile.id]: 'token' });
    hashes.set(denialKey, { [profile.id]: '1' });

    await clearJamAdmittance(event);

    expect(hashes.has(admittedKey)).toBe(false);
    expect(hashes.has(denialKey)).toBe(false);
  });
});
