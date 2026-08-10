import type {
  Profile,
  EntryData,
  PostWithMeta,
  Notification,
  ReactionData,
  JamRecordingWithMeta,
  RSVP,
  RsvpResponse,
} from '@openpeepshq/common/types';
import { getConnection } from '../redis/connection';
import type { RedisClientType } from 'redis';
import { logger } from '../log';
import { onceQueue, registerOnceHandler } from './once';

const log = logger('app:events');

export type CoreEvents = {
  profileCreated: (profile: Profile) => void;
  postCreated: (post: PostWithMeta) => void;
  jamRecordingCompleted: (recording: JamRecordingWithMeta) => void;
  followCreated: (follower: Profile, followed: Profile) => void;
  notificationCreated: (notification: Notification) => void;
  reactionCreated: (
    profile: Profile,
    post: PostWithMeta,
    data: ReactionData,
  ) => void;
  entryCreated: (profile: Profile, post: PostWithMeta, data: EntryData) => void;
  rsvpCreated: (
    profile: Profile,
    post: PostWithMeta,
    data: { type: 'rsvp'; data: RSVP; previousResponse?: RsvpResponse },
  ) => void;
  postAnnounced: (post: PostWithMeta) => void;
  configUpdated: (namespace: string, name: string) => void;
  /** Profile settings changed — clear in-process caches in all services. */
  profileSettingsUpdated: (profileId: string) => void;
};

export type CoreEventKey = keyof CoreEvents;

// `satisfies Record<CoreEventKey, true>` guarantees at compile time that every
// event key is present and that no unexpected keys can slip in.
const validEventKeyMap = {
  profileCreated: true,
  postCreated: true,
  jamRecordingCompleted: true,
  followCreated: true,
  notificationCreated: true,
  reactionCreated: true,
  entryCreated: true,
  rsvpCreated: true,
  postAnnounced: true,
  configUpdated: true,
  profileSettingsUpdated: true,
} satisfies Record<CoreEventKey, true>;

export const VALID_EVENT_KEYS = Object.keys(validEventKeyMap) as CoreEventKey[];

let connectionPromise: Promise<RedisClientType> | undefined = undefined;
const publishConnection = async () => {
  if (connectionPromise) {
    const existing = await connectionPromise;
    if (existing.isOpen) return existing;
    connectionPromise = undefined;
  }
  connectionPromise = getConnection();
  return connectionPromise;
};

const baseHub = (prefix: string) => ({
  /**
   * Fan-out must not fail the caller (register/react/etc.). Redis publish and
   * the BullMQ once-queue are best-effort side channels.
   */
  emit: async (eventType: string, ...eventArgs: unknown[]) => {
    const qualifiedEventType = `${prefix}:${eventType}`;
    try {
      const conn = await publishConnection();
      await conn.publish(qualifiedEventType, JSON.stringify(eventArgs));
      log.info({ qualifiedEventType }, 'hub event published');
    } catch (err) {
      log.error({ qualifiedEventType, err }, 'hub publish failed');
    }
    try {
      await onceQueue().add(qualifiedEventType, eventArgs);
    } catch (err) {
      log.error({ qualifiedEventType, err }, 'hub once-queue enqueue failed');
    }
  },
  on: <T extends unknown[]>(
    eventType: string,
    handler: (...args: T) => unknown,
  ) => {
    // Subscriber mode requires a dedicated connection (not the publisher).
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
