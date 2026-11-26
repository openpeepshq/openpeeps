import type {
  AuthorizationData,
  Jam,
  MuteParticipantRequest,
  PostDataUnion,
  PostWithMeta,
  Profile,
} from '@openpeepshq/common/types';
import {
  jamFromEvent,
  jamRoomName,
  postIdFromJamRoomName,
  uniquePostsById,
} from '@openpeepshq/common/lib';
import {
  listParticipantIds,
  reclaimOrphanJamRoom,
  roomService,
  shouldReclaimJamRoom,
  stopRecording,
  stopRtmpStream,
} from './livekit';
import { jamStateCache, LIVE_JAMS_CACHE_KEY, liveJamPostsCache } from './cache';
import { localInstanceDomain, parseRoomInstanceDomain } from './helpers';
import { findPost } from '../posts';
import { allpeepDb } from '../db';
import { createJamEvent } from './mutations';
import { postsMapping } from '../posts/mapping';
import { clearJamAdmittance } from './waitingRoom';
import { hub } from '../events';
import { uuidv7 } from 'uuidv7';
import { canReadPost } from '../posts/helpers';
import { capabilitiesConfig } from '../config';
import { logger } from '../log';

export { createJamToken, createJamEgressToken } from './token';
export { diagnoseLivekit, isLivekitConnected } from './health';
export {
  startRecording,
  stopRecording,
  startRtmpStream,
  stopRtmpStream,
  stopEgress,
  listParticipantIds,
  reclaimOrphanJamRoom,
  finishRecording,
  getJamRecordingUrl,
  getJamObserverPath,
  JAM_ROOM_EMPTY_TIMEOUT_SEC,
  JAM_ROOM_DEPARTURE_TIMEOUT_SEC,
} from './livekit';
export { rtmpStreamOutput } from './rtmp';
export { setJamSpotlight } from './spotlight';
export {
  jamRecordingStopQueue,
  jamRecordingStopWorker,
  scheduleRecordingAutoStop,
  cancelRecordingAutoStop,
  JAM_RECORDING_MAX_DURATION_MS,
} from './jobs';
export * from './waitingRoom';
export * from './mutations';
export * from './finders';
export * from './export';
export * from './recording';
export {
  deriveJamRecordingUploadSecret,
  jamRecordingUploadSecret,
} from './recordingUploadAuth';

const log = logger('app:jams:livekit');

const invalidateJamCaches = async (jamId: string) => {
  await Promise.all([
    jamStateCache.del(jamId).catch(() => undefined),
    liveJamPostsCache.del(LIVE_JAMS_CACHE_KEY).catch(() => undefined),
  ]);
};

/**
 * Shared persist-and-notify step for the two jam-config ban mutations
 * ({@link removeParticipant} and {@link liftJamBan}): writes the jam's new
 * `banned` list to the post, invalidates the live-jam caches, and re-broadcasts
 * the fresh post to the moderators. Both paths must keep doing all three —
 * dropping the cache invalidation here would be the drift this exists to
 * prevent.
 */
const persistJamBannedList = async (
  jamEvent: PostWithMeta,
  jam: Jam,
  banned: string[],
) => {
  const { db } = await allpeepDb();
  await postsMapping.update(db, jamEvent.id, {
    data: {
      ...jamEvent.data,
      type: 'event',
      jam: { ...jam, banned },
    } as PostDataUnion,
  });
  const freshPost = await findPost(jamEvent.id);
  await invalidateJamCaches(jamEvent.id);
  if (freshPost) {
    await hub.emit('postUpdated', freshPost, jam.moderators);
  }
};

const reclaimLocalOrphan = (post: PostWithMeta) => {
  void reclaimOrphanJamRoom(post).then(() => invalidateJamCaches(post.id));
};

/**
 * Expensive LiveKit scan — shared across callers via {@link liveJamPostsCache}.
 * Auth filtering happens in {@link listLiveJams} so the cache is not per-user.
 */
const fetchLiveJamPosts = async (): Promise<PostWithMeta[]> => {
  let rs;
  try {
    rs = await roomService();
  } catch (e) {
    log.warn(
      `Failed to reach LiveKit (${(e as Error).message}). Admins can diagnose this at /admin/diagnostics/livekit.`,
    );
    return [];
  }
  if (rs === undefined) {
    return [];
  }

  let rooms;
  let localDomain;
  try {
    [rooms, localDomain] = await Promise.all([
      rs.listRooms(),
      localInstanceDomain(),
    ]);
  } catch (e) {
    log.warn(
      `Failed to list live jam rooms (${(e as Error).message}). Admins can diagnose this at /admin/diagnostics/livekit.`,
    );
    return [];
  }

  const posts = await Promise.all(
    rooms.map(async (room) => {
      const roomDomain = parseRoomInstanceDomain(room.metadata);
      // Shared SFU: ignore other communities' rooms. Untagged rooms (pre-stamp)
      // still go through findPost so local legacy jams keep working.
      if (localDomain && roomDomain && roomDomain !== localDomain) {
        return undefined;
      }

      const postId = postIdFromJamRoomName(room.name);
      // Zero participants: host may still be connecting after Start, or the
      // room is inside departureTimeout. LiveKit closes these; deleting them
      // drops the host back to the join screen.
      if (!room.numParticipants) {
        return undefined;
      }

      // Someone is connected. Egress counts toward numParticipants, so an
      // egress-only room never hits emptyTimeout and has to be reclaimed.
      const humans = await listParticipantIds(room.name);
      if (shouldReclaimJamRoom(room.numParticipants, humans.length)) {
        const post = await findPost(postId);
        if (post) {
          reclaimLocalOrphan(post);
        } else if (!roomDomain || roomDomain === localDomain) {
          void rs.deleteRoom(room.name).catch(() => undefined);
        }
        return undefined;
      }

      return findPost(postId);
    }),
  );

  return uniquePostsById(posts);
};

export const listLiveJams = async (
  authData: AuthorizationData,
): Promise<PostWithMeta[]> => {
  const [posts, config] = await Promise.all([
    liveJamPostsCache.wrap(LIVE_JAMS_CACHE_KEY, fetchLiveJamPosts),
    capabilitiesConfig(),
  ]);
  return posts.filter(canReadPost(config, authData));
};

export const findJamEvent = async (
  id: string,
): Promise<PostWithMeta | undefined> =>
  findPost(id).then((post) =>
    post?.data?.type === 'event' && post.data?.jam ? post : undefined,
  );

export const closeJam = async (
  profile: Profile,
  jamEvent: PostWithMeta,
  recurrenceId?: string,
) => {
  const rs = await roomService();
  if (rs === undefined) {
    return undefined;
  }

  await stopRecording(jamEvent, recurrenceId);
  await stopRtmpStream(jamEvent);

  return rs
    .deleteRoom(jamRoomName(jamEvent.id, recurrenceId))
    .then(async () => {
      await Promise.all([
        invalidateJamCaches(jamRoomName(jamEvent.id, recurrenceId)),
        clearJamAdmittance(jamEvent, recurrenceId).catch(() => undefined),
      ]);
      return createJamEvent({
        id: uuidv7(),
        jamId: jamEvent.id,
        type: 'close',
        profileId: profile.id,
        recurrenceId,
      });
    });
};

export const muteParticipant = async (
  jamId: string,
  data: MuteParticipantRequest,
  recurrenceId?: string,
) => {
  const rs = await roomService();
  if (rs === undefined) {
    return { success: false };
  }
  const result = await rs.mutePublishedTrack(
    jamRoomName(jamId, recurrenceId),
    data.identity,
    data.trackSid,
    true,
  );
  if (!result) {
    return { success: false };
  }
  return { success: result?.muted };
};

/**
 * Bans a removed profile from rejoining, evicts them now, and records the kick.
 *
 * (a) The ban persist happens before the eviction on purpose: the eviction is
 *     best-effort (its failure is swallowed below), but the ban is not — the
 *     profile must be locked out even if LiveKit is unreachable.
 * (b) An already-banned target skips only the persist: the waiting-room
 *     admittance clear, the eviction attempt, and the `kicked` record still run,
 *     so a pending admittee is not left stranded.
 */
export const removeParticipant = async (
  jamEvent: PostWithMeta,
  profileId: string,
  recurrenceId?: string,
) => {
  const jam = jamFromEvent(jamEvent);
  if (jam && !jam.banned?.includes(profileId)) {
    await persistJamBannedList(jamEvent, jam, [
      ...(jam.banned ?? []),
      profileId,
    ]);
  }

  await clearJamAdmittance(jamEvent, recurrenceId, [profileId]);

  const rs = await roomService();
  if (rs !== undefined) {
    try {
      // LiveKit disconnects the participant with reason PARTICIPANT_REMOVED,
      // which the client uses to show the removed-from-jam state.
      await rs.removeParticipant(
        jamRoomName(jamEvent.id, recurrenceId),
        profileId,
      );
    } catch (err) {
      // The participant may already have left the room; the ban persists.
      log.debug(err, 'removeParticipant: LiveKit removal failed');
    }
  }

  await createJamEvent({
    id: uuidv7(),
    jamId: jamEvent.id,
    type: 'kicked',
    profileId,
    recurrenceId,
  });
};

/** Lifts a ban; the profile simply becomes able to rejoin again. */
export const liftJamBan = async (jamEvent: PostWithMeta, profileId: string) => {
  const jam = jamFromEvent(jamEvent);
  if (!jam?.banned?.includes(profileId)) {
    return;
  }

  const banned = jam.banned.filter((id) => id !== profileId);
  await persistJamBannedList(jamEvent, jam, banned);
};
