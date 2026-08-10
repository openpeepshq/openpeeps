import {
  type AuthorizationData,
  type MuteParticipantRequest,
  type PostWithMeta,
  type Profile,
} from '@openpeepshq/common/types';
import {
  listParticipantIds,
  reclaimOrphanJamRoom,
  roomService,
  stopRecording,
} from './livekit';
import { jamStateCache, LIVE_JAMS_CACHE_KEY, liveJamPostsCache } from './cache';
import { localInstanceDomain, parseRoomInstanceDomain } from './helpers';
import { findPost } from '../posts';
import { createJamEvent } from './mutations';
import { clearJamAdmittance } from './waitingRoom';
import { uuidv7 } from 'uuidv7';
import { canReadPost } from '../posts/helpers';
import { capabilitiesConfig } from '../config';

export { createJamToken, createJamEgressToken } from './token';
export {
  startRecording,
  stopRecording,
  stopEgress,
  listParticipantIds,
  reclaimOrphanJamRoom,
  finishRecording,
  getJamRecordingUrl,
  getJamObserverPath,
  JAM_ROOM_EMPTY_TIMEOUT_SEC,
  JAM_ROOM_DEPARTURE_TIMEOUT_SEC,
} from './livekit';
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
export * from './recording';
export {
  deriveJamRecordingUploadSecret,
  jamRecordingUploadSecret,
} from './recordingUploadAuth';

const invalidateJamCaches = async (jamId: string) => {
  await Promise.all([
    jamStateCache.del(jamId).catch(() => undefined),
    liveJamPostsCache.del(LIVE_JAMS_CACHE_KEY).catch(() => undefined),
  ]);
};

const reclaimLocalOrphan = (post: PostWithMeta) => {
  void reclaimOrphanJamRoom(post).then(() => invalidateJamCaches(post.id));
};

/**
 * Expensive LiveKit scan — shared across callers via {@link liveJamPostsCache}.
 * Auth filtering happens in {@link listLiveJams} so the cache is not per-user.
 */
const fetchLiveJamPosts = async (): Promise<PostWithMeta[]> => {
  const rs = await roomService();
  if (rs === undefined) {
    return [];
  }

  const [rooms, localDomain] = await Promise.all([
    rs.listRooms(),
    localInstanceDomain(),
  ]);

  const posts = await Promise.all(
    rooms.map(async (room) => {
      const roomDomain = parseRoomInstanceDomain(room.metadata);
      // Shared SFU: ignore other communities' rooms. Untagged rooms (pre-stamp)
      // still go through findPost so local legacy jams keep working.
      if (localDomain && roomDomain && roomDomain !== localDomain) {
        return undefined;
      }

      // Fast path: Room.numParticipants includes hidden egress — 0 means truly empty.
      if (!room.numParticipants) {
        const post = await findPost(room.name);
        if (post) {
          reclaimLocalOrphan(post);
        } else if (!roomDomain || roomDomain === localDomain) {
          void rs.deleteRoom(room.name).catch(() => undefined);
        }
        return undefined;
      }

      // Slow path only when someone (human or egress) is connected — distinguish
      // egress-only ghosts from real live jams.
      const humans = await listParticipantIds(room.name);
      if (humans.length === 0) {
        const post = await findPost(room.name);
        if (post) {
          reclaimLocalOrphan(post);
        } else if (!roomDomain || roomDomain === localDomain) {
          void rs.deleteRoom(room.name).catch(() => undefined);
        }
        return undefined;
      }

      return findPost(room.name);
    }),
  );

  return posts.filter(Boolean) as PostWithMeta[];
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

export const closeJam = async (profile: Profile, jamEvent: PostWithMeta) => {
  const rs = await roomService();
  if (rs === undefined) {
    return undefined;
  }

  await stopRecording(jamEvent);

  return rs.deleteRoom(jamEvent.id).then(async () => {
    await Promise.all([
      invalidateJamCaches(jamEvent.id),
      clearJamAdmittance(jamEvent).catch(() => undefined),
    ]);
    return createJamEvent({
      id: uuidv7(),
      jamId: jamEvent.id,
      type: 'close',
      profileId: profile.id,
    });
  });
};

export const muteParticipant = async (
  jamId: string,
  data: MuteParticipantRequest,
) => {
  const rs = await roomService();
  if (rs === undefined) {
    return { success: false };
  }
  const result = await rs.mutePublishedTrack(
    jamId,
    data.identity,
    data.trackSid,
    true,
  );
  if (!result) {
    return { success: false };
  }
  return { success: result?.muted };
};
