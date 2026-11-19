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

/** Keep admissions around for the length of a long jam / mobile backgrounding. */
const ADMITTANCE_TTL_SEC = 12 * 60 * 60;

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

const currentAdmittance = (event: PostWithMeta, recurrenceId?: string) =>
  getSharedConnection().then((conn) =>
    conn.hGetAll(admittanceKey(event, recurrenceId)),
  );

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
  onlyProfileIds?: string[],
): Promise<void> => {
  if (onlyProfileIds !== undefined) {
    // Per-profile path: an explicit (possibly empty) id set must never fall
    // through to the wipe-everything del() below, so `[]` is a no-op.
    if (onlyProfileIds.length === 0) return;
    await getSharedConnection().then((conn) =>
      // ioredis flattens an array field at the protocol level.
      conn.hDel(admittanceKey(event, recurrenceId), onlyProfileIds),
    );
    return;
  }
  await getSharedConnection().then((conn) =>
    conn.del(admittanceKey(event, recurrenceId)),
  );
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

export const admittanceWatch = (
  jamEvent: PostWithMeta,
  profileId: string,
  onToken: (token: string) => Promise<void> | void,
  recurrenceId?: string,
) =>
  currentAdmittance(jamEvent, recurrenceId)
    .then((admittance) => {
      if (admittance[profileId]) {
        return onToken(admittance[profileId]);
      }
    })
    .then(() => getConnection())
    .then((conn) =>
      conn
        .subscribe(
          `__keyspace@0__:${admittanceKey(jamEvent, recurrenceId)}`,
          async (event) => {
            if ('hset' === event) {
              const token = await getSharedConnection().then((c) =>
                c.hGet(admittanceKey(jamEvent, recurrenceId), profileId),
              );
              if (token) {
                await disconnect(conn);
                return onToken(token);
              }
            }
          },
        )
        .then(() => async () => {
          await getSharedConnection().then((c) =>
            c.hDel(waitingRoomKey(jamEvent, recurrenceId), profileId),
          );
          await disconnect(conn);
        }),
    );

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
