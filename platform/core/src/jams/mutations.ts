import type { JamEventData, JamRecordingData } from '@openpeeps/common/types';
import { allpeepDb } from '../db';
import { jamEventsMapping, jamRecordingsMapping } from './mapping';

export const createJamEvent = (jamEvent: JamEventData) =>
  allpeepDb().then(({ db }) => jamEventsMapping.create(db, jamEvent));

export const updateJamRecording = (
  recordingId: string,
  recording: Partial<JamRecordingData>,
) =>
  allpeepDb().then(({ db }) =>
    jamRecordingsMapping.update(db, recordingId, recording),
  );
