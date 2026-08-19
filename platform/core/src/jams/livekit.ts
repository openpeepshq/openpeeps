import {
  JamRecording,
  JamRecordingWithMeta,
  JamState,
  PostWithMeta,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { config } from '../config';
import {
  DataPacket_Kind,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  RoomServiceClient,
} from 'livekit-server-sdk';
import { connectRecording } from './helpers';
import { allpeepDb } from '../db';
import { serverRootUrl } from '../server';
import { uuidv7 } from 'uuidv7';
import { createJamEvent, updateJamRecording } from './mutations';
import { findActiveRecording, findActiveRtmpStream } from './finders';
import { cancelRecordingAutoStop, scheduleRecordingAutoStop } from './jobs';
import { jamRecordingUploadSecret } from './recordingUploadAuth';
import { createSignedServiceToken } from '../accessTokens/tokens';
import { unprocessableRequest } from '../errors';
import { logger } from '../log';
import { rtmpStreamOutput, rtmpWebEgressOptions } from './rtmp';

const encoder = new TextEncoder();
const log = logger('app:jams:livekit');

/** Seconds a new room stays open before anyone joins. */
export const JAM_ROOM_EMPTY_TIMEOUT_SEC = 5 * 60;
/** Seconds a room stays open after the last participant leaves. */
export const JAM_ROOM_DEPARTURE_TIMEOUT_SEC = 60;

export const roomService = async () => {
  const { url, apiKey, apiSecret } = (await config()).jams.livekit;
  if (!url || !apiKey || !apiSecret) {
    return undefined;
  }

  return new RoomServiceClient(url, apiKey, apiSecret);
};

export const listParticipantIds = async (jamId: string) => {
  const rs = await roomService();
  if (rs === undefined) {
    return [];
  }
  return (await rs.listParticipants(jamId))
    .map((p) => p.identity)
    .filter((identity) => !identity.startsWith('EG_'));
};

const getJamEgressToken = async (jamId: string) =>
  createSignedServiceToken({
    scopes: [
      {
        resource: { type: 'jam', id: jamId },
      },
    ],
    name: 'jam-egress',
    expirationTime: '1d',
  }).then((token) => token.signedToken);

const isLoopbackHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const assertEgressCanReachRecordingHost = async (recordingUrl: string) => {
  const { jams } = await config();
  if (!jams.livekit.url) {
    throw unprocessableRequest({
      errorKey: 'jamsRecordingEgressUnreachable',
      parameters: { recordingHost: new URL(recordingUrl).hostname },
    });
  }
  const recordingHost = new URL(recordingUrl).hostname;
  const livekitHost = new URL(jams.livekit.url).hostname;
  if (isLoopbackHost(recordingHost) && !isLoopbackHost(livekitHost)) {
    throw unprocessableRequest({
      errorKey: 'jamsRecordingEgressUnreachable',
      parameters: { recordingHost },
    });
  }
};

/**
 * Relative path for the observer view (full jam UI). Used for human
 * moderator observer links, jam recording web egress, and RTMP web egress.
 */
export const getJamObserverPath = async (jamId: string) => {
  const jamEgressToken = await getJamEgressToken(jamId);
  return `/events/${jamId}/jam?observer=true&token=${jamEgressToken}`;
};

export const getJamRecordingUrl = async (jamId: string) =>
  `${await serverRootUrl()}${await getJamObserverPath(jamId)}`;

const getEgressClient = async () => {
  const { url, apiKey, apiSecret } = (await config()).jams.livekit;
  return new EgressClient(url, apiKey, apiSecret);
};

export const startRecording = async (
  profile: ProfileWithMeta,
  jamPost: PostWithMeta,
): Promise<JamRecording> => {
  const jamId = jamPost.id;
  const recordingId = uuidv7();

  // Clear any recording left `active` by a previous failed egress so the new
  // one is the sole active recording for this jam.
  const staleRecording = await findActiveRecording(jamPost);
  if (staleRecording) {
    await cancelRecordingAutoStop(staleRecording.id);
    await updateJamRecording(staleRecording.id, { status: 'failed' });
  }

  let recording = (await allpeepDb().then(({ db }) =>
    connectRecording(db, profile, jamPost, {
      id: recordingId,
      status: 'requested',
    }),
  )) as JamRecording;
  // Prefer the persisted edge id in case insert paths ever diverge.
  const persistedRecordingId = recording.id;

  const egressClient = await getEgressClient();
  const outputFilename = `${persistedRecordingId}.mp4`;
  const recordingUrl = await getJamRecordingUrl(jamId);
  await assertEgressCanReachRecordingHost(recordingUrl);

  const uploadSecret = await jamRecordingUploadSecret(persistedRecordingId);
  const egressInfo = await egressClient.startWebEgress(
    recordingUrl,
    new EncodedFileOutput({
      output: {
        case: 's3',
        value: {
          endpoint: `${await serverRootUrl()}/s3`,
          bucket: 'allpeep-recordings',
          accessKey: persistedRecordingId,
          secret: uploadSecret,
          sessionToken: persistedRecordingId,
          forcePathStyle: true,
        },
      },
      filepath: outputFilename,
      fileType: EncodedFileType.MP4,
    }),
    {
      encodingOptions: EncodingOptionsPreset.H264_1080P_30,
    },
  );

  recording = (await updateJamRecording(persistedRecordingId, {
    egressId: egressInfo.egressId,
    status: 'active',
  })) as JamRecording;

  const jamEvent = await createJamEvent({
    id: uuidv7(),
    jamId,
    type: 'recordStart',
    profileId: profile.id,
  });

  await roomService().then(async (rs) =>
    rs?.sendData(
      jamId,
      encoder.encode(JSON.stringify(jamEvent)),
      DataPacket_Kind.LOSSY,
      {},
    ),
  );

  // BullMQ delayed job survives API/worker restarts (unlike setTimeout).
  await scheduleRecordingAutoStop(jamId, persistedRecordingId);

  return recording;
};

const assertLivekitConfigured = async () => {
  const { url, apiKey, apiSecret } = (await config()).jams.livekit;
  if (!url || !apiKey || !apiSecret) {
    throw unprocessableRequest({ errorKey: 'error.jamNotOpen' });
  }
};

const assertJamRoomOpen = async (jamId: string) => {
  const rs = await roomService();
  if (rs === undefined) {
    throw unprocessableRequest({ errorKey: 'error.jamNotOpen' });
  }
  const rooms = await rs.listRooms([jamId]);
  if (rooms.length !== 1) {
    throw unprocessableRequest({ errorKey: 'error.jamNotOpen' });
  }
};

const emitJamEvent = async (
  jamId: string,
  jamEvent: { id: string; jamId: string; type: string; profileId: string },
) => {
  await roomService().then(async (rs) =>
    rs?.sendData(
      jamId,
      encoder.encode(JSON.stringify(jamEvent)),
      DataPacket_Kind.LOSSY,
      {},
    ),
  );
};

export const startRtmpStream = async (
  profile: ProfileWithMeta,
  jamPost: PostWithMeta,
  rtmpUrl: string,
  destinationHost?: string,
): Promise<JamRecording> => {
  await assertLivekitConfigured();
  await assertJamRoomOpen(jamPost.id);

  await stopRtmpStream(jamPost);

  const jamId = jamPost.id;
  const recordingId = uuidv7();

  let recording = (await allpeepDb().then(({ db }) =>
    connectRecording(db, profile, jamPost, {
      id: recordingId,
      status: 'requested',
      kind: 'rtmp',
      destinationHost,
    }),
  )) as JamRecording;
  const persistedRecordingId = recording.id;

  const observerUrl = await getJamRecordingUrl(jamId);
  await assertEgressCanReachRecordingHost(observerUrl);

  const egressClient = await getEgressClient();
  const egressInfo = await egressClient.startWebEgress(
    observerUrl,
    rtmpStreamOutput(rtmpUrl),
    rtmpWebEgressOptions,
  );

  recording = (await updateJamRecording(persistedRecordingId, {
    egressId: egressInfo.egressId,
    status: 'active',
  })) as JamRecording;

  const jamEvent = await createJamEvent({
    id: uuidv7(),
    jamId,
    type: 'streamStart',
    profileId: profile.id,
  });
  await emitJamEvent(jamId, jamEvent);

  return recording;
};

export const stopRtmpStream = async (jamPost: PostWithMeta) => {
  const stream = await findActiveRtmpStream(jamPost);
  if (!stream) {
    return undefined;
  }

  if (stream.egressId) {
    void stopEgress(stream.egressId);
  }

  await updateJamRecording(stream.id, { status: 'completed' });

  const jamEvent = await createJamEvent({
    id: uuidv7(),
    jamId: jamPost.id,
    type: 'streamStop',
    profileId: stream.profile.id,
  });
  await emitJamEvent(jamPost.id, jamEvent);

  return { ...stream, status: 'completed' as const };
};

export const stopEgress = async (egressId: string) => {
  const egressClient = await getEgressClient();
  try {
    await egressClient.stopEgress(egressId);
  } catch {
    // LiveKit egress can time out or already be stopped/failed; the user-facing
    // stop action should not fail because of that.
  }
};

export const stopRecording = async (jamPost: PostWithMeta) => {
  const jamRecording = await findActiveRecording(jamPost);
  if (!jamRecording) {
    return undefined;
  }

  await cancelRecordingAutoStop(jamRecording.id);

  if (jamRecording.egressId) {
    // Don't block the API response on egress stop; LiveKit can take 15s+ and
    // may time out while the upload still completes in the background.
    void stopEgress(jamRecording.egressId);
  }

  // Emit `recordStop` immediately so the recording overlay clears, rather than
  // waiting for the egress upload to finish.
  const jamEvent = await createJamEvent({
    id: uuidv7(),
    jamId: jamPost.id,
    type: 'recordStop',
    profileId: jamRecording.profile.id,
  });

  await roomService().then(async (rs) =>
    rs?.sendData(
      jamPost.id,
      encoder.encode(JSON.stringify(jamEvent)),
      DataPacket_Kind.LOSSY,
      {},
    ),
  );

  return jamRecording;
};

/**
 * Stops leftover egress and deletes a LiveKit room that has no human
 * participants (egress-only / orphan rooms). Safe to call repeatedly.
 */
export const reclaimOrphanJamRoom = async (jam: PostWithMeta) => {
  try {
    await stopRecording(jam);
  } catch (e) {
    log.warn(
      `Failed to stop recording while reclaiming jam ${jam.id}: ${(e as Error).message}`,
    );
  }
  try {
    await stopRtmpStream(jam);
  } catch (e) {
    log.warn(
      `Failed to stop RTMP stream while reclaiming jam ${jam.id}: ${(e as Error).message}`,
    );
  }
  try {
    const rs = await roomService();
    await rs?.deleteRoom(jam.id);
  } catch (e) {
    log.warn(
      `Failed to delete orphan jam room ${jam.id}: ${(e as Error).message}`,
    );
  }
};

export const finishRecording = async (jamRecording: JamRecordingWithMeta) => {
  const jamEvent = await createJamEvent({
    id: uuidv7(),
    jamId: jamRecording.post.id,
    type: 'recordStop',
    profileId: jamRecording.profile.id,
  });

  await roomService().then(async (rs) =>
    rs?.sendData(
      jamRecording.post.id,
      encoder.encode(JSON.stringify(jamEvent)),
      DataPacket_Kind.LOSSY,
      {},
    ),
  );
};

export const jamState = async (
  jam: PostWithMeta,
  hideParticipants?: boolean,
): Promise<JamState> => {
  const rs = await roomService();
  if (rs === undefined) {
    return {
      participants: [],
      active: false,
    };
  }
  const room = await rs
    .listRooms([jam.id])
    .then((rooms) => rooms.find((r) => r.name === jam.id));
  if (!room) {
    return {
      participants: [],
      active: false,
    };
  }
  const participants = await listParticipantIds(jam.id);
  if (participants.length === 0) {
    // Room exists only for egress ghosts / empty leftovers — reclaim so it
    // stops appearing under Live jams.
    void reclaimOrphanJamRoom(jam);
    return {
      participants: [],
      active: false,
    };
  }
  return {
    participants: hideParticipants ? [] : participants,
    active: true,
  };
};
