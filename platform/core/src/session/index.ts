import type {
  SessionEvent,
  SessionPlatform,
} from '@openpeepshq/common/types';
import {
  disconnect,
  getConnection,
  getSharedConnection,
} from '../redis/connection';
import { logger } from '../log';

const log = logger('core:session');

const eventsChannel = (profileId: string) =>
  `session:events:profile:${profileId}`;
const presenceOnlineKey = 'session:presence:online';
const presenceProfileKey = (profileId: string) =>
  `session:presence:profile:${profileId}`;
const PRESENCE_TTL_SEC = 90;

export const publishSessionEvent = async (
  profileId: string,
  event: SessionEvent,
) => {
  const conn = await getSharedConnection();
  await conn.publish(eventsChannel(profileId), JSON.stringify(event));
};

export const subscribeToSessionEvents = async (
  profileId: string,
  onEvent: (event: SessionEvent) => void | Promise<void>,
) => {
  const conn = await getConnection();
  await conn.subscribe(eventsChannel(profileId), (message) => {
    try {
      void onEvent(JSON.parse(message) as SessionEvent);
    } catch (error) {
      log.error('Failed to parse session event', error);
    }
  });
  return () => disconnect(conn);
};

export const registerSessionPresence = async ({
  profileId,
  connectionId,
  platform,
}: {
  profileId: string;
  connectionId: string;
  platform: SessionPlatform;
}) => {
  const conn = await getSharedConnection();
  const key = presenceProfileKey(profileId);
  await conn.hSet(
    key,
    connectionId,
    JSON.stringify({ platform, connectedAt: Date.now() }),
  );
  await conn.expire(key, PRESENCE_TTL_SEC);
  await conn.sAdd(presenceOnlineKey, profileId);
};

export const refreshSessionPresence = async (
  profileId: string,
  connectionId: string,
) => {
  const conn = await getSharedConnection();
  const key = presenceProfileKey(profileId);
  if (!(await conn.hExists(key, connectionId))) return;
  await conn.expire(key, PRESENCE_TTL_SEC);
};

export const unregisterSessionPresence = async (
  profileId: string,
  connectionId: string,
) => {
  const conn = await getSharedConnection();
  const key = presenceProfileKey(profileId);
  await conn.hDel(key, connectionId);
  if ((await conn.hLen(key)) === 0) {
    await conn.del(key);
    await conn.sRem(presenceOnlineKey, profileId);
  }
};

export const getSessionPresence = async (profileId: string) => {
  const conn = await getSharedConnection();
  const raw = await conn.hGetAll(presenceProfileKey(profileId));
  const connections = Object.entries(raw).flatMap(([connectionId, value]) => {
    try {
      const parsed = JSON.parse(value) as {
        platform: SessionPlatform;
        connectedAt: number;
      };
      return [{ connectionId, ...parsed }];
    } catch {
      return [];
    }
  });
  if (connections.length === 0) return undefined;
  return {
    profileId,
    connections,
    platforms: [...new Set(connections.map((c) => c.platform))],
  };
};

export const listOnlineSessionPresence = async () => {
  const conn = await getSharedConnection();
  const profileIds = await conn.sMembers(presenceOnlineKey);
  const profiles = [];
  for (const profileId of profileIds) {
    const presence = await getSessionPresence(profileId);
    if (presence) profiles.push(presence);
    else await conn.sRem(presenceOnlineKey, profileId);
  }
  return profiles;
};
