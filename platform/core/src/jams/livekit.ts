import {
  JamRecording,
  JamRecordingWithMeta,
  JamState,
  PostWithMeta,
  ProfileWithMeta,
} from '@openpeeps/common/types';
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
import { jwtUtil } from '../jwt';
import { serverRootUrl } from '../server';
import { uuidv7 } from 'uuidv7';
import { createJamEvent, updateJamRecording } from './mutations';
import { findActiveRecording } from './finders';
import { createSignedServiceToken } from '../accessTokens/tokens';
import { unprocessableRequest } from '../errors';

const encoder = new TextEncoder();

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
 * Relative path for the observer view (full jam UI). Used both for human
 * moderator observer links and as the page LiveKit web egress records.
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

  const egressInfo = await egressClient.startWebEgress(
    recordingUrl,
    new EncodedFileOutput({
      output: {
        case: 's3',
        value: {
          endpoint: `${await serverRootUrl()}/s3`,
          bucket: 'allpeep-recordings',
          accessKey: persistedRecordingId,
          secret: persistedRecordingId,
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

  setTimeout(
    async () => {
      await stopRecording(jamPost);
    },
    60 * 60 * 1000,
  );

  return recording;
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
    .listRooms()
    .then((rooms) => rooms.find((r) => r.name === jam.id));
  if (room) {
    const participants = await listParticipantIds(jam.id);
    return {
      participants: hideParticipants ? [] : participants,
      active: participants.length > 0,
    };
  } else {
    return {
      participants: [],
      active: false,
    };
  }
};

const getActiveRecording = async (jamId: string) => {
  const egressClient = await getEgressClient();
};
