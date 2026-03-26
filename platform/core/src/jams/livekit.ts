import { JamRecording, JamRecordingWithMeta, JamState, PostWithMeta, ProfileWithMeta } from '@openpeeps/common/types';
import { config } from '../config';
import { DataPacket_Kind, EgressClient, EncodedFileOutput, EncodedFileType, EncodingOptionsPreset, RoomServiceClient } from 'livekit-server-sdk';
import { connectRecording } from './helpers';
import { allpeepDb } from '../db';
import { createServiceToken } from '../auth';
import { jwtUtil } from '../jwt';
import { serverRootUrl } from '../server';
import { uuidv7 } from 'uuidv7';
import { createJamEvent, updateJamRecording } from './mutations';
import { findActiveRecording } from './finders';

const encoder = new TextEncoder();

export const roomService = async () => {
  const { url, apiKey, apiSecret } = (await config()).jams.livekit;
  if (!url || !apiKey || !apiSecret) {
    return undefined
  }

  return new RoomServiceClient(url, apiKey, apiSecret);
};

export const listParticipantIds = async (jamId: string) => {
  const rs = await roomService();
  if (rs === undefined) {
    return []
  }
  return (await rs.listParticipants(jamId)).map((p) => p.identity).filter((identity) => !identity.startsWith('EG_'));
}

const getJamEgressToken = async (jamId: string) =>
  jwtUtil().then(async (jwt) =>
    jwt.sign(await createServiceToken([
      {
        resource: { type: 'jam', id: jamId },
      },
    ]))
  );

export const getJamRecordingUrl = async (jamId: string) => {
  const jamEgressToken = await getJamEgressToken(jamId);
  return `${await serverRootUrl()}/events/${jamId}/jam?observer=true&token=${jamEgressToken}`;
}


const getEgressClient = async () => {
  const { url, apiKey, apiSecret } = (await config()).jams.livekit;
  return new EgressClient(url, apiKey, apiSecret);
};

export const startRecording = async (profile: ProfileWithMeta, jamPost: PostWithMeta): Promise<JamRecording> => {
  const jamId = jamPost.id;
  const recordingId = uuidv7();
  let recording = await allpeepDb().then(({ db }) => connectRecording(db, profile, jamPost, {
    id: recordingId,
    status: 'requested',
  }));

  const egressClient = await getEgressClient();
  const outputFilename = `${recordingId}.mp4`;
  const recordingUrl = await getJamRecordingUrl(jamId);

  const egressInfo = await egressClient.startWebEgress(
    recordingUrl,
    new EncodedFileOutput({
      output: {
        case: 's3',
        value: {
          endpoint: `${await serverRootUrl()}/s3`,
          bucket: 'allpeep-recordings',
          accessKey: recordingId,
          secret: recordingId,
          sessionToken: recordingId,
          forcePathStyle: true,
        }
      },
      filepath: outputFilename,
      fileType: EncodedFileType.MP4,
    }),
    {
      encodingOptions: EncodingOptionsPreset.H264_1080P_30,
    });

  recording = await updateJamRecording(recordingId, {
    egressId: egressInfo.egressId,
    status: 'active',
  });

  const jamEvent = await createJamEvent({
    id: uuidv7(),
    jamId,
    type: 'recordStart',
    profileId: profile.id,
  });

  await roomService().then(async (rs) => rs?.sendData(
    jamId,
    encoder.encode(JSON.stringify(jamEvent)),
    DataPacket_Kind.LOSSY,
    {}
  ));

  setTimeout(async () => {
    await stopRecording(jamPost);
  }, 60 * 60 * 1000);

  return recording
}

export const stopEgress = async (egressId: string) => {
  const egressClient = await getEgressClient();
  await egressClient.stopEgress(egressId);
}

export const stopRecording = async (jamPost: PostWithMeta) => {
  const jamRecording = await findActiveRecording(jamPost);
  if (jamRecording?.egressId) {
    await stopEgress(jamRecording.egressId);
  }
  return jamRecording;
}

export const finishRecording = async (jamRecording: JamRecordingWithMeta) => {
  const jamEvent = await createJamEvent({
    id: uuidv7(),
    jamId: jamRecording.post.id,
    type: 'recordStop',
    profileId: jamRecording.profile.id,
  });

  await roomService().then(async (rs) => rs?.sendData(
    jamRecording.post.id,
    encoder.encode(JSON.stringify(jamEvent)),
    DataPacket_Kind.LOSSY,
    {}
  ));

}


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