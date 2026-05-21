import { jamRecordingSchema, type JamEvent, type JamRecording, type PostWithMeta } from '@openpeeps/common/types';
import { allpeepDb } from '../db';
import { jamEventsMapping, jamRecordingsMapping } from './mapping';
import { addStartLimit, sortNewestFirst } from '../db/helpers';
import { getJamState } from './cache';
import { transformJamRecordingData } from './helpers';

export const baseListJam = (
  props: { jamId: string; type?: JamEvent['type'] },
  { start, limit = 100 }: { start?: string; limit?: number },
) =>
  addStartLimit<JamEvent>(
    jamEventsMapping.filter({ matches: props }),
    start,
    limit,
  );

export const listJamEvents = (
  jamId: string,
  { start, limit }: { start?: string; limit?: number } = {},
) =>
  allpeepDb().then(({ db }) =>
    baseListJam({ jamId }, { start, limit }).all(db),
  );

export const listAttendance = (
  jamId: string,
  { start, limit }: { start?: string; limit?: number } = {},
) =>
  allpeepDb().then(({ db }) =>
    baseListJam({ jamId, type: 'join' }, { start, limit }).all(db),
  );

export const findJamState = async (jam: PostWithMeta, hideParticipants?: boolean) => {
  const state = await getJamState(jam);
  return {
    ...state,
    participants: hideParticipants ? [] : state.participants,
  };
}

export const findJamRecording = async (recordingId: string) =>
  allpeepDb()
    .then(({ db }) => jamRecordingsMapping.find(db, recordingId))
    .then(recording => recording ? transformJamRecordingData(recording) : undefined);

export const findActiveRecording = async (jamPost: PostWithMeta) =>
  allpeepDb()
    .then(({ db }) => jamRecordingsMapping.filter({ matches: { _to: `posts/${jamPost.id}`, status: 'active' } }).first(db))
    .then(recording => recording ? transformJamRecordingData(recording) : undefined);

export const listPostRecordings = async (postId: string): Promise<JamRecording[]> =>
  allpeepDb()
    .then(({ db }) =>
      sortNewestFirst(jamRecordingsMapping.filter({ matches: { _to: `posts/${postId}` } })).all(db),
    )
    .then((recordings) => recordings.map((recording) => jamRecordingSchema.parse(recording)));
