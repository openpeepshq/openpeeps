import {
  JamRecording,
  JamRecordingData,
  jamRecordingSchema,
  JamRecordingWithMeta,
  PostWithMeta,
  ProfileWithMeta,
} from '@openpeeps/common/types';
import { connector } from '../db/helpers';
import { collectionInfos } from '../db/structure';
import { findProfile } from '../profiles';
import { findPost } from '../posts';

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
