import type { RsvpCancelNotice } from '@openpeepshq/common/lib';
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

/** Upper bound on `hub.ready()`'s wait for in-flight `on` subscriptions. */
const SUBSCRIBE_READY_TIMEOUT_MS = 10_000;

export type CoreEvents = {
  profileCreated: (profile: Profile) => void;
  postCreated: (post: PostWithMeta) => void;
  postUpdated: (post: PostWithMeta, previousJamModerators: string[]) => void;
  postDeleted: (post: PostWithMeta) => void;
  jamRecordingCompleted: (recording: JamRecordingWithMeta) => void;
  followCreated: (follower: Profile, followed: Profile) => void;
  /** Follow edge removed (unfollow). Federation reacts by sending Undo(Follow) for outbound follows only. */
  followDeleted: (follower: Profile, followed: Profile) => void;
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
    data: {
      type: 'rsvp';
      data: RSVP;
      occurrenceIds?: string[];
      previousResponse?: RsvpResponse;
      cancel?: RsvpCancelNotice;
    },
  ) => void;
  postAnnounced: (post: PostWithMeta) => void;
  configUpdated: (namespace: string, name: string) => void;
  /** Profile settings changed — clear in-process caches in all services. */
  profileSettingsUpdated: (profileId: string) => void;
  pollEnded: (post: PostWithMeta) => void;
};

export type CoreEventKey = keyof CoreEvents;

// `satisfies Record<CoreEventKey, true>` guarantees at compile time that every
// event key is present and that no unexpected keys can slip in.
const validEventKeyMap = {
  profileCreated: true,
  postCreated: true,
  postUpdated: true,
  postDeleted: true,
  jamRecordingCompleted: true,
  followCreated: true,
  followDeleted: true,
  notificationCreated: true,
  reactionCreated: true,
  entryCreated: true,
  rsvpCreated: true,
  postAnnounced: true,
  configUpdated: true,
  profileSettingsUpdated: true,
  pollEnded: true,
} satisfies Record<CoreEventKey, true>;

export const VALID_EVENT_KEYS = Object.keys(validEventKeyMap) as CoreEventKey[];

type Unsubscribe = () => void;

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

const baseHub = (prefix: string) => {
  const subscriptions = new Map<
    string,
    { conn: RedisClientType; channels: string[] }
  >();
  // Subscribe promises in flight. `on` registers a handler and then subscribes
  // asynchronously (Redis connect + SUBSCRIBE), so there is a window in which an
  // `emit` publishes to a channel that has no subscriber yet. `ready()` lets a
  // caller await that window closing before relying on delivery.
  const pendingSubscriptions = new Set<Promise<void>>();

  return {
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
    ): Unsubscribe => {
      const channel = `${prefix}:${eventType}`;
      const sub = getConnection()
        .then((conn) => {
          conn.subscribe(channel, (message) => {
            const args = JSON.parse(message);
            handler(...args);
          });
          let entry = subscriptions.get(channel);
          if (!entry) {
            entry = { conn, channels: [] };
            subscriptions.set(channel, entry);
          }
          entry.channels.push(channel);
        })
        .catch((err: unknown) => {
          // Subscribe is best-effort like emit, but a permanently failed
          // subscription means this handler is dead — log it rather than
          // leaving a floating rejected promise.
          log.error({ channel, err }, 'hub subscribe failed');
        });
      pendingSubscriptions.add(sub);
      void sub.finally(() => pendingSubscriptions.delete(sub));
      return () => {
        getConnection().then((conn) => conn.unsubscribe(channel));
        const entry = subscriptions.get(channel);
        if (entry) {
          entry.channels = entry.channels.filter((c) => c !== channel);
          if (entry.channels.length === 0) {
            subscriptions.delete(channel);
          }
        }
      };
    },
    once: (eventType: string, handler: (...args: unknown[]) => unknown) => {
      registerOnceHandler(`${prefix}:${eventType}`, handler);
    },
    /**
     * Resolves once every `on` subscription registered so far has finished its
     * asynchronous Redis connect + SUBSCRIBE. Await this before relying on
     * pub/sub delivery: an `emit` published while a subscription is still
     * pending is lost (Redis has no subscriber to deliver to). Federation
     * attaches correctness-critical handlers (`postDeleted` tombstones), so
     * `installFederation` awaits this before the server accepts writes.
     *
     * Bounded by `SUBSCRIBE_READY_TIMEOUT_MS`: node-redis retries `connect()`
     * forever, so an unavailable Redis would otherwise hold server startup
     * hostage. On timeout we proceed with a warning — a down Redis already
     * degrades every hub consumer (emits fail too), so waiting longer buys
     * nothing.
     */
    ready: async () => {
      const start = Date.now();
      while (pendingSubscriptions.size > 0) {
        const remaining = SUBSCRIBE_READY_TIMEOUT_MS - (Date.now() - start);
        const settled = await Promise.race([
          Promise.allSettled([...pendingSubscriptions]).then(
            () => 'settled' as const,
          ),
          new Promise<'timeout'>((resolve) =>
            setTimeout(
              () => resolve('timeout'),
              Math.max(0, remaining),
            ).unref(),
          ),
        ]);
        if (settled === 'timeout' && pendingSubscriptions.size > 0) {
          log.warn(
            {
              pending: pendingSubscriptions.size,
              elapsedMs: Date.now() - start,
            },
            'hub subscriptions still pending; continuing without them',
          );
          return;
        }
      }
    },
  };
};

export const hub = baseHub('allpeep:core');
export { onceWorker, onceQueue } from './once';
