import {
  type PublicProfile,
  publicProfileSchema,
  type PostWithMeta,
} from '@openpeepshq/common/types';
import { assertJamRsvpAllowed, createJamToken } from './token';
import {
  disconnect,
  getConnection,
  getSharedConnection,
} from '../redis/connection';

const waitingRoomKey = (event: PostWithMeta) => `jams:waiting-room:${event.id}`;
const admittanceKey = (event: PostWithMeta) => `jams:admitted:${event.id}`;

/** Keep admissions around for the length of a long jam / mobile backgrounding. */
const ADMITTANCE_TTL_SEC = 12 * 60 * 60;

const currentWaitingRoom = (event: PostWithMeta) =>
  getSharedConnection()
    .then((conn) => conn.hGetAll(waitingRoomKey(event)))
    .then((wrRaw) => Object.entries(wrRaw))
    .then((entries) => entries.filter((e) => e[0] && e[1]))
    .then((entries) =>
      entries.map(([key, value]) => [
        key,
        publicProfileSchema.partial().parse(JSON.parse(value)),
      ]),
    )
    .then((entries) => Object.fromEntries(entries));

const currentAdmittance = (event: PostWithMeta) =>
  getSharedConnection().then((conn) => conn.hGetAll(admittanceKey(event)));

export const isAdmittedToJam = async (
  event: PostWithMeta,
  profileId: string,
): Promise<boolean> => {
  const conn = await getSharedConnection();
  return Boolean(await conn.hExists(admittanceKey(event), profileId));
};

export const clearJamAdmittance = async (
  event: PostWithMeta,
): Promise<void> => {
  await getSharedConnection().then((conn) => conn.del(admittanceKey(event)));
};

export const currentWaitingRoomWatch = (
  jamEvent: PostWithMeta,
  onChange: (
    waitingRoom: Record<string, PublicProfile>,
  ) => void | Promise<void>,
) =>
  currentWaitingRoom(jamEvent)
    .then(onChange)
    .then(() => getConnection())
    .then((conn) =>
      conn
        .subscribe(`__keyspace@0__:${waitingRoomKey(jamEvent)}`, (event) => {
          if (['hset', 'hdel'].includes(event)) {
            currentWaitingRoom(jamEvent).then(onChange);
          }
        })
        .then(() => () => disconnect(conn)),
    );

export const admittanceWatch = (
  jamEvent: PostWithMeta,
  profileId: string,
  onToken: (token: string) => Promise<void> | void,
) =>
  currentAdmittance(jamEvent)
    .then((admittance) => {
      if (admittance[profileId]) {
        return onToken(admittance[profileId]);
      }
    })
    .then(() => getConnection())
    .then((conn) =>
      conn
        .subscribe(
          `__keyspace@0__:${admittanceKey(jamEvent)}`,
          async (event) => {
            if ('hset' === event) {
              const token = await getSharedConnection().then((c) =>
                c.hGet(admittanceKey(jamEvent), profileId),
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
            c.hDel(waitingRoomKey(jamEvent), profileId),
          );
          await disconnect(conn);
        }),
    );

export const joinWaitingRoom = async (
  event: PostWithMeta,
  profile: PublicProfile,
) => {
  assertJamRsvpAllowed(event, profile);

  const conn = await getSharedConnection();
  const wrKey = waitingRoomKey(event);

  // Do not clear admittance here — once admitted, the guest may reconnect
  // (mobile idle / tab freeze) without a second moderator approval.
  await conn.hSet(wrKey, { [profile.id]: JSON.stringify(profile) });
};

export const acceptFromWaitingRoom = async (
  event: PostWithMeta,
  profileId: string,
) => {
  const conn = await getSharedConnection();
  const wrKey = waitingRoomKey(event);
  const profile = await publicProfileSchema
    .parseAsync(JSON.parse((await conn.hGet(wrKey, profileId)) || 'undefined'))
    .catch(() => undefined);
  await conn.hDel(wrKey, profileId);
  if (!event || !profile) {
    return undefined;
  }

  const aKey = admittanceKey(event);
  await conn.hSet(aKey, {
    [profile.id]: await createJamToken(event, profile),
  });
  await conn.expire(aKey, ADMITTANCE_TTL_SEC);
};
