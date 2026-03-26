import {
  Jam,
  PostWithMeta,
  PublicProfile,
  publicProfileSchema,
} from '@openpeeps/common/types';
import { authNeeded, forbidden, notFound } from '../errors';
import { config } from '../config';
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { hub } from '../events';
import { roomService } from './livekit';
import { createJamEvent } from './mutations';
import { uuidv7 } from 'uuidv7';

const calculateSources = (jam: Jam, profile: PublicProfile) => {
  const sources: TrackSource[] = [TrackSource.MICROPHONE];
  if (jam.videoEnabled) {
    sources.push(
      TrackSource.CAMERA,
      TrackSource.SCREEN_SHARE,
      TrackSource.SCREEN_SHARE_AUDIO,
    );
  }
  if (jam.presenters?.includes(profile.id)) {
    sources.push(TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO);
  }
  return sources;
};

export const createJamEgressToken = async (event: PostWithMeta) => {
  const jamId = event.id;
  const jam = event.data?.type === "event" && event.data?.jam;
  if (!jam) {
    throw notFound({ errorKey: 'error.jamNotFound', parameters: { jamId } });
  }
  const { apiKey, apiSecret } = (await config()).jams.livekit;
  const accessToken = new AccessToken(apiKey, apiSecret, {
    identity: `EG_${uuidv7()}`,
    metadata: JSON.stringify({
      observer: true,
    }),
  });
  accessToken.addGrant({
    room: jamId,
    hidden: true,
    roomJoin: true,
    roomRecord: true,
    canSubscribe: true,
  });

  return accessToken.toJwt();

};

export const createJamToken = async (
  event: PostWithMeta,
  profile: PublicProfile,
  external: boolean = false,
) => {
  if (!profile.id) throw authNeeded({ errorKey: 'error.profileRequired' });

  const jamId = event.id;
  const jam = event.data?.type === "event" && event.data?.jam;

  if (!jam) {
    throw notFound({ errorKey: 'error.jamNotFound', parameters: { jamId } });
  }

  const rs = await roomService()

  if (rs === undefined) {
    throw forbidden({ errorKey: 'error.jamNotOpen' });
  }

  const rooms = await rs.listRooms([jamId]);
  const jamOpen = rooms.length === 1;

  if (!jamOpen && !jam?.moderators.includes(profile.id)) {
    throw forbidden({ errorKey: 'error.jamNotOpen' });
  }

  if (!jamOpen) {
    createJamEvent({
      id: uuidv7(),
      jamId,
      type: 'start',
      profileId: profile.id,
    });
  }

  const { apiKey, apiSecret } = (await config()).jams.livekit;
  const accessToken = new AccessToken(apiKey, apiSecret, {

    identity: profile.id,
    metadata: JSON.stringify({
      profile: publicProfileSchema.parse(profile),
      handRaised: undefined,
      external,
      observer: false,
    }),
  });
  accessToken.addGrant({
    room: jamId,
    roomJoin: true,
    roomAdmin: jam?.moderators.includes(profile.id),
    roomRecord: jam?.moderators.includes(profile.id),
    canPublish:
      jam?.type === 'video-call' || !!jam?.speakers?.includes(profile.id),
    canPublishSources: calculateSources(jam, profile),
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });

  if (!jamOpen) {
    hub.emit('jamStarted', profile, event);
  }

  return accessToken.toJwt();
};
