import { jamFromEvent } from '@openpeepshq/common/lib';
import type { JamEventData, JamRecordingData } from '@openpeepshq/common/types';
import { forbidden, notFound } from '../errors';
import { allpeepDb } from '../db';
import { findPost } from '../posts';
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

/**
 * Soft-deletes a jam chat message and blanks its content.
 *
 * Only the jam host, a jam moderator, or the message author may delete. The
 * `deletedAt` soft-delete flag is what hides the row from every consumer
 * (`listJamEvents`, attendance, export) — those all go through the
 * soft-delete-filtered mappings; blanking `content` is belt-and-braces so no
 * path that bypasses the flag can resurrect the text. `jamId` and `type` are
 * re-checked server-side so an id pointing at a different jam or a non-message
 * event (join/leave/start/…) is a 404, never a cross-jam write.
 */
export const deleteJamEvent = async (
  actorId: string,
  jamId: string,
  jamEventId: string,
) => {
  const { db } = await allpeepDb();
  // ignoreSoftDelete: a re-delete must be a no-op 404, not a re-mutation.
  const jamEvent = await jamEventsMapping.find(db, jamEventId, {
    ignoreSoftDelete: true,
  });
  if (!jamEvent || jamEvent.jamId !== jamId || jamEvent.type !== 'message') {
    throw notFound({ errorKey: 'error.jamNotFound', parameters: { jamId } });
  }

  const jamPost = await findPost(jamId);
  const jam = jamPost ? jamFromEvent(jamPost) : undefined;
  if (!jamPost || !jam) {
    throw notFound({ errorKey: 'error.jamNotFound', parameters: { jamId } });
  }

  const isHost = jamPost.profile.id === actorId;
  const isModerator = jam.moderators?.includes(actorId) ?? false;
  const isAuthor = jamEvent.profileId === actorId;
  if (!isHost && !isModerator && !isAuthor) {
    throw forbidden({ errorKey: 'error.forbidden' });
  }

  await jamEventsMapping.update(db, jamEventId, { content: '' });
  await jamEventsMapping.delete(db, jamEventId);
  return true;
};
