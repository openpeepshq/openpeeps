import { jamRoomName } from '@openpeepshq/common/lib';
import {
  jamWaitingRoomEntrySchema,
  type JamWaitingRoomEntry,
  type PublicProfile,
  type PostWithMeta,
} from '@openpeepshq/common/types';
import { assertJamRsvpAllowed, createJamToken } from './token';
import {
  disconnect,
  getConnection,
  getSharedConnection,
} from '../redis/connection';
import { getProfile } from '../profiles';

const waitingRoomKey = (event: PostWithMeta, recurrenceId?: string) =>
  `jams:waiting-room:${jamRoomName(event.id, recurrenceId)}`;
const admittanceKey = (event: PostWithMeta, recurrenceId?: string) =>
  `jams:admitted:${jamRoomName(event.id, recurrenceId)}`;
const denialKey = (event: PostWithMeta, recurrenceId?: string) =>
  `jams:denied:${jamRoomName(event.id, recurrenceId)}`;

/** Keep admissions around for the length of a long jam / mobile backgrounding. */
const ADMITTANCE_TTL_SEC = 12 * 60 * 60;

/** Denials only need to outlive the current join attempt's stream. */
export const DENIAL_TTL_SEC = 10 * 60;

const currentWaitingRoom = (event: PostWithMeta, recurrenceId?: string) =>
  getSharedConnection()
    .then((conn) => conn.hGetAll(waitingRoomKey(event, recurrenceId)))
    .then((wrRaw) => Object.entries(wrRaw))
    .then((entries) => entries.filter((e) => e[0] && e[1]))
    .then((entries) =>
      entries.map(
        ([key, value]) =>
          [key, jamWaitingRoomEntrySchema.parse(JSON.parse(value))] as [
            string,
            JamWaitingRoomEntry,
          ],
      ),
    )
    .then((entries) => Object.fromEntries(entries));

export const isAdmittedToJam = async (
  event: PostWithMeta,
  profileId: string,
  recurrenceId?: string,
): Promise<boolean> => {
  const conn = await getSharedConnection();
  return Boolean(
    await conn.hExists(admittanceKey(event, recurrenceId), profileId),
  );
};

export const clearJamAdmittance = async (
  event: PostWithMeta,
  recurrenceId?: string,
): Promise<void> => {
  const conn = await getSharedConnection();
  await conn.del(admittanceKey(event, recurrenceId));
  await conn.del(denialKey(event, recurrenceId));
};

export const currentWaitingRoomWatch = (
  jamEvent: PostWithMeta,
  onChange: (
    waitingRoom: Record<string, JamWaitingRoomEntry>,
  ) => void | Promise<void>,
  recurrenceId?: string,
) =>
  currentWaitingRoom(jamEvent, recurrenceId)
    .then(onChange)
    .then(() => getConnection())
    .then((conn) =>
      conn
        .subscribe(
          `__keyspace@0__:${waitingRoomKey(jamEvent, recurrenceId)}`,
          (event) => {
            if (['hset', 'hdel'].includes(event)) {
              currentWaitingRoom(jamEvent, recurrenceId).then(onChange);
            }
          },
        )
        .then(() => () => disconnect(conn)),
    );

/**
 * The keyspace event is the fast path for waking a queued guest, but a
 * missed event (a reject that lands around the subscription window, or a
 * Redis without `notify-keyspace-events`) must not strand the guest in the
 * waiting room forever. As a fallback, re-check the decision keys on an
 * interval for a bounded window after subscribing.
 */
export const ADMITTANCE_FALLBACK_POLL_MS = 500;
export const ADMITTANCE_FALLBACK_POLLS = 40;

export const admittanceWatch = (
  jamEvent: PostWithMeta,
  profileId: string,
  onToken: (token: string) => Promise<void> | void,
  recurrenceId?: string,
  onDenied?: () => Promise<void> | void,
) => {
  let settled = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  const aKey = admittanceKey(jamEvent, recurrenceId);
  const dKey = denialKey(jamEvent, recurrenceId);

  const notifyIfDecided = async () => {
    if (settled) return true;
    const shared = await getSharedConnection();
    const token = await shared.hGet(aKey, profileId);
    if (token) {
      settled = true;
      await onToken(token);
      return true;
    }
    const denied = await shared.hGet(dKey, profileId);
    if (denied) {
      settled = true;
      await onDenied?.();
      return true;
    }
    return false;
  };

  return notifyIfDecided().then(() =>
    getConnection().then(async (conn) => {
      let connClosed = false;
      const settle = async () => {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = undefined;
        }
        if (!connClosed) {
          connClosed = true;
          await disconnect(conn);
        }
      };
      if (!settled) {
        const onKeyEvent = async (event: string) => {
          if (event !== 'hset') return;
          if (await notifyIfDecided()) {
            await settle();
          }
        };
        await conn.subscribe(`__keyspace@0__:${aKey}`, onKeyEvent);
        await conn.subscribe(`__keyspace@0__:${dKey}`, onKeyEvent);
        let polls = 0;
        pollTimer = setInterval(() => {
          void (async () => {
            if (await notifyIfDecided()) {
              await settle();
            } else if (++polls >= ADMITTANCE_FALLBACK_POLLS) {
              // The window closed without a decision; the watch stays open
              // and the keyspace events remain the wake-up path from here.
              if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = undefined;
              }
            }
          })();
        }, ADMITTANCE_FALLBACK_POLL_MS);
        if (await notifyIfDecided()) {
          await settle();
        }
      }

      return async () => {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = undefined;
        }
        await getSharedConnection().then((c) =>
          c.hDel(waitingRoomKey(jamEvent, recurrenceId), profileId),
        );
        if (conn.isOpen) {
          await disconnect(conn);
        }
      };
    }),
  );
};

export const joinWaitingRoom = async (
  event: PostWithMeta,
  profile: PublicProfile,
  recurrenceId?: string,
) => {
  assertJamRsvpAllowed(event, profile, recurrenceId);

  const conn = await getSharedConnection();
  const wrKey = waitingRoomKey(event, recurrenceId);

  // Store only the display name keyed by profile id — the full object
  // (incl. guestData) does not round-trip through the moderation stream.
  // The admission path re-fetches the profile by id.
  const entry: JamWaitingRoomEntry = {
    displayName: profile.displayName ?? profile.handle,
  };

  // Do not clear admittance here — once admitted, the guest may reconnect
  // (mobile idle / tab freeze) without a second moderator approval.
  // A new request does clear a previous rejection.
  await conn.hDel(denialKey(event, recurrenceId), profile.id);
  await conn.hSet(wrKey, { [profile.id]: JSON.stringify(entry) });
};

export const acceptFromWaitingRoom = async (
  event: PostWithMeta,
  profileId: string,
  recurrenceId?: string,
) => {
  const conn = await getSharedConnection();
  const wrKey = waitingRoomKey(event, recurrenceId);
  const entryRaw = await conn.hGet(wrKey, profileId);
  await conn.hDel(wrKey, profileId);
  if (!event || !entryRaw) {
    return undefined;
  }

  const entry = jamWaitingRoomEntrySchema.safeParse(JSON.parse(entryRaw)).data;
  if (!entry) {
    return undefined;
  }
  // Re-fetch the full profile by id so token generation never depends on the
  // streamed queue shape. A profile that can no longer be fetched (deleted
  // while queued) is refused: the queue entry is already consumed above, so
  // returning undefined is enough — never mint a token for a shapeless
  // fabricated profile.
  const profile = await getProfile(profileId, true);
  if (!profile) {
    return undefined;
  }

  const aKey = admittanceKey(event, recurrenceId);
  await conn.hSet(aKey, {
    [profile.id]: await createJamToken(event, profile, { recurrenceId }),
  });
  await conn.expire(aKey, ADMITTANCE_TTL_SEC);
};

/** Remove a waiting profile and wake their join stream so they stop waiting. */
export const rejectFromWaitingRoom = async (
  event: PostWithMeta,
  profileId: string,
  recurrenceId?: string,
) => {
  const conn = await getSharedConnection();
  const dKey = denialKey(event, recurrenceId);
  await conn.hDel(waitingRoomKey(event, recurrenceId), profileId);
  await conn.hSet(dKey, { [profileId]: '1' });
  // Only needs to outlive the current join attempt — the guest's join stream
  // polls this key; a stale denial must not survive future join requests.
  await conn.expire(dKey, DENIAL_TTL_SEC);
};
