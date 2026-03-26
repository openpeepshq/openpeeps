import {
  type MuteParticipantRequest,
  type PostWithMeta,
  type Profile,
  ProfileWithMeta,
} from '@openpeeps/common/types';
import { roomService, stopRecording } from './livekit';
import { findPost } from '../posts';
import { createJamEvent } from './mutations';
import { uuidv7 } from 'uuidv7';
import { canReadPost } from '../posts/helpers';
import { capabilitiesConfig } from '../config';

export { createJamToken, createJamEgressToken } from './token';
export {
  startRecording,
  stopRecording,
  stopEgress,
  listParticipantIds,
  finishRecording,
  getJamRecordingUrl,
} from './livekit';
export * from './waitingRoom';
export * from './mutations';
export * from './finders';


export const listLiveJams = async (profile?: ProfileWithMeta): Promise<PostWithMeta[]> => {
  const rs = await roomService();

  if (rs === undefined) {
    return []
  }

  const rooms = await rs.listRooms();

  const config = await capabilitiesConfig();

  return Promise.all(rooms.map(async (room) => findPost(room.name))).then(
    (posts) => posts.filter(Boolean).filter(canReadPost(config, profile))
  ) as Promise<PostWithMeta[]>

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
    return undefined
  }

  await stopRecording(jamEvent)

  return rs.deleteRoom(jamEvent.id).then(() =>
    createJamEvent({
      id: uuidv7(),
      jamId: jamEvent.id,
      type: 'close',
      profileId: profile.id,
    }));
}


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