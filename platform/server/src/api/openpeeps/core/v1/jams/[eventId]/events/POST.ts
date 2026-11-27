import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { occurrenceForJamStart } from '@openpeepshq/common/lib';
import { jamEventDataSchema, jamEventSchema } from '@openpeepshq/common/types';
import { ensureProfileOrGuest } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import {
  createJamEvent,
  findJamEvent,
  listParticipantIds,
} from '@openpeepshq/core/jams';

/**
 * The event types a room participant may persist through this endpoint.
 * The rest of `jamEventDataSchema`'s types (start/close/kicked/
 * recordStart/recordStop/streamStart/streamStop) are server-only facts —
 * the room-open path, closeJam, the orphan-room reclaim and the
 * recording/RTMP handlers emit them directly. A client must not be able to
 * mint a `start` row, which the analytics rollup would count as a session.
 */
const clientLegitTypes = ['message', 'reaction', 'join', 'leave'] as const;

export const Input = jamEventDataSchema;
export const Output = jamEventSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam');
    }

    const profile = await ensureProfileOrGuest(event, 'read', {
      type: 'jams',
      id: jamEvent.id,
    });

    const data = jamEventDataSchema.parse({
      ...input,
      jamId: input.eventId,
    });

    // Only the client-legit types may be persisted through this endpoint.
    // The persisted facts are what the analytics rollup counts, so the
    // server-only lifecycle types (start/close/kicked/record*/stream*) are
    // rejected outright rather than persisted and counted.
    if (!(clientLegitTypes as readonly string[]).includes(data.type)) {
      throw forbidden('You can only report your own activity for this jam');
    }

    // The profileId is normalized to the authenticated actor server-side for
    // every type: a client may not mint a join or a chat message/reaction
    // attributed to someone else (a client-supplied foreign id is rejected).
    if (data.profileId && data.profileId !== profile.id) {
      throw forbidden('You can only report your own activity for this jam');
    }
    data.profileId = profile.id;

    // Chat and reactions must come from someone actually in the room.
    if (data.type === 'message' || data.type === 'reaction') {
      const participantIds = await listParticipantIds(input.eventId);
      if (!participantIds.includes(profile.id)) {
        throw forbidden('You are not a participant in this jam');
      }
    }

    // Attendance is the per-occurrence fact the analytics rollup counts, so it
    // must be stamped with the occurrence the session is for — not left NULL.
    // The LiveKit room name does not carry the occurrence (recurring jams use
    // one room per event), and the client mints joins without one, so it is
    // resolved server-side from the event schedule, exactly like the `start`
    // row (token.ts): a recurring series resolves to the occurrence still open
    // now; a one-off jam has no schedule and stays occurrence-less.
    if (data.type === 'join' || data.type === 'leave') {
      const eventData =
        jamEvent.data?.type === 'event' ? jamEvent.data : undefined;
      if (eventData?.recurrence) {
        const occurrence = occurrenceForJamStart(eventData)?.recurrenceId;
        if (occurrence) data.recurrenceId = occurrence;
      }
    }

    return createJamEvent(data);
  },
);
