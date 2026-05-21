import type {
  JamRecordingWithMeta,
  MediaAttachment,
} from '@openpeeps/common/types';
import { hub } from '../events';
import { findJamRecording } from './finders';
import { updateJamRecording } from './mutations';

/**
 * Persists the uploaded recording file as a completed jam recording and
 * notifies listeners (e.g. streaming pre-warm) via `jamRecordingCompleted`.
 */
export const completeJamRecording = async (
  recordingId: string,
  attachment: MediaAttachment,
): Promise<JamRecordingWithMeta | undefined> => {
  await updateJamRecording(recordingId, {
    attachment,
    status: 'completed',
  });

  const recording = await findJamRecording(recordingId);
  if (recording) {
    hub.emit('jamRecordingCompleted', recording);
  }

  return recording;
};
