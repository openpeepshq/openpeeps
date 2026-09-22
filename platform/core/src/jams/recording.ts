import type {
  Event,
  JamRecording,
  JamRecordingWithMeta,
  MediaAttachment,
  PostWithMeta,
} from '@openpeepshq/common/types';
import { jamRecordingSchema } from '@openpeepshq/common/types';
import { jamRecordingAcceptsUpload } from '@openpeepshq/common/lib';
import { hub } from '../events';
import { createPost } from '../posts';
import { allpeepDb } from '../db';
import { findJamRecording } from './finders';
import { cancelRecordingAutoStop } from './jobs';
import { jamRecordingsMapping } from './mapping';
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

/**
 * Marks a stopped recording as still accepting its multipart complete. Used
 * after egress stop so a later start does not fail the in-flight upload.
 */
export const finalizeJamRecording = async (
  recordingId: string,
): Promise<void> => {
  const recording = await findJamRecording(recordingId);
  if (!recording) {
    return;
  }
  if (recording.status !== 'requested' && recording.status !== 'active') {
    return;
  }
  await cancelRecordingAutoStop(recordingId);
  await updateJamRecording(recordingId, { status: 'finalizing' });
};

/**
 * Marks an in-progress or finalizing recording failed. Completed recordings
 * are left unchanged. Multipart temp files are the S3 layer's responsibility.
 */
export const failJamRecording = async (recordingId: string): Promise<void> => {
  const recording = await findJamRecording(recordingId);
  if (!recording) {
    return;
  }
  if (!jamRecordingAcceptsUpload(recording.status)) {
    return;
  }
  await cancelRecordingAutoStop(recordingId);
  await updateJamRecording(recordingId, { status: 'failed' });
};

export const publishJamRecordingReply = async (
  eventPost: PostWithMeta,
  recordingId: string,
): Promise<JamRecording> => {
  const recording = await findJamRecording(recordingId);

  if (!recording) {
    throw new Error('Recording not found');
  }

  if (recording.post.id !== eventPost.id) {
    throw new Error('Recording does not belong to this event');
  }

  if (recording.replyPostId) {
    throw new Error('Recording already published');
  }

  if (recording.status !== 'completed' || !recording.attachment) {
    throw new Error('Recording is not ready');
  }

  const event = eventPost.data as Event;
  const reply = await createPost(
    {
      type: 'note',
      content: `Jam recording for ${event.name}`,
      attachments: [recording.attachment],
    },
    eventPost.profile,
    {
      type: 'note',
      visibility: eventPost.visibility,
      creatorId: eventPost.profile.id,
    },
    {
      inReplyToId: eventPost.id,
      groupId: eventPost.groupId,
      audience: eventPost.audience,
    },
  );

  await updateJamRecording(recordingId, { replyPostId: reply.id });

  return jamRecordingSchema.parse({ ...recording, replyPostId: reply.id });
};

export const deleteJamRecording = async (
  eventPost: PostWithMeta,
  recordingId: string,
): Promise<void> => {
  const recording = await findJamRecording(recordingId);

  if (!recording) {
    throw new Error('Recording not found');
  }

  if (recording.post.id !== eventPost.id) {
    throw new Error('Recording does not belong to this event');
  }

  if (recording.status === 'active' || recording.status === 'requested') {
    throw new Error('Recording is still in progress');
  }

  const { db } = await allpeepDb();
  await jamRecordingsMapping.delete(db, recordingId);
};
