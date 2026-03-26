import type {
  Profile,
  EntryData,
  PostWithMeta,
  Notification,
  ReactionData,
} from '@openpeeps/common/types';
import { getConnection } from '../redis/connection';
import type { RedisClientType } from 'redis';
import { logger } from '../log';
import { onceQueue, registerOnceHandler } from './once';

const log = logger('app:events');

export type CoreEvents = {
  profileCreated: (profile: Profile) => void;
  postCreated: (post: PostWithMeta) => void;
  followCreated: (follower: Profile, followed: Profile) => void;
  notificationCreated: (notification: Notification) => void;
  reactionCreated: (
    profile: Profile,
    post: PostWithMeta,
    data: ReactionData,
  ) => void;
  entryCreated: (profile: Profile, post: PostWithMeta, data: EntryData) => void;
  postAnnounced: (post: PostWithMeta) => void;
  configUpdated: (namespace: string, name: string) => void;
};

export type CoreEventKey = keyof CoreEvents;

let connectionPromise: Promise<RedisClientType> | undefined = undefined;
const publishConnection = () => {
  if (!connectionPromise) {
    connectionPromise = getConnection();
  }
  return connectionPromise;
};

const baseHub = (prefix: string) => ({
  emit: async (eventType: string, ...eventArgs: unknown[]) => {
    const qualifiedEventType = `${prefix}:${eventType}`;
    await publishConnection().then((conn) => {
      conn
        .publish(qualifiedEventType, JSON.stringify(eventArgs))
        .then(() => log.info({ qualifiedEventType, eventArgs }));
    });
    await onceQueue().add(qualifiedEventType, eventArgs);
  },
  on: <T extends unknown[]>(
    eventType: string,
    handler: (...args: T) => unknown,
  ) => {
    getConnection().then((conn) =>
      conn.subscribe(`${prefix}:${eventType}`, (message) => {
        const args = JSON.parse(message);
        handler(...args);
      }),
    );
  },
  once: (eventType: string, handler: (...args: unknown[]) => unknown) => {
    registerOnceHandler(`${prefix}:${eventType}`, handler);
  },
});

export const hub = baseHub('allpeep:core');
export { onceWorker, onceQueue } from './once';
