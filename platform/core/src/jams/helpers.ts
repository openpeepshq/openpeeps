import {
  JamRecording,
  JamRecordingData,
  jamRecordingSchema,
  JamRecordingWithMeta,
  PostWithMeta,
  ProfileWithMeta,
} from '@openpeeps/common/types';
import { connector } from '../db/helpers';
import { collectionInfos } from '../db';
import { findProfile } from '../profiles';
import { findPost } from '../posts';
import { config } from '../config';

export const connectRecording = connector<
  ProfileWithMeta,
  PostWithMeta,
  JamRecordingData
>(
  collectionInfos.profilesCollection,
  collectionInfos.postsCollection,
  collectionInfos.jamRecordingsCollection,
);

export const transformJamRecordingData = async (
  recording: JamRecording & { _from: string; _to: string },
): Promise<JamRecordingWithMeta> => ({
  ...(jamRecordingSchema.parse(recording) as JamRecording),
  profile: (await findProfile(
    recording._from.split('/')[1],
  )) as ProfileWithMeta,
  post: (await findPost(recording._to.split('/')[1])) as PostWithMeta,
});

/** Hostname used when stamping LiveKit room metadata (`instanceDomain`). */
export const localInstanceDomain = async (): Promise<string | undefined> => {
  const host = (await config()).server.host;
  if (!host) return undefined;
  const domain = (
    host.includes('://') ? new URL(host).hostname : host.replace(/:\d+$/, '')
  ).toLowerCase();
  return domain || undefined;
};

export const parseRoomInstanceDomain = (
  metadata: string | undefined,
): string | undefined => {
  if (!metadata) return undefined;
  try {
    const parsed = JSON.parse(metadata) as { instanceDomain?: unknown };
    return typeof parsed.instanceDomain === 'string'
      ? parsed.instanceDomain.toLowerCase()
      : undefined;
  } catch {
    return undefined;
  }
};
