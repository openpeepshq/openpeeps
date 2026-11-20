import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden } from '#lib/errors';
import { canModerateJam, parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { jamWaitingRoomEntrySchema } from '@openpeepshq/common/types';
import { currentWaitingRoomWatch, findJamEvent } from '@openpeepshq/core/jams';
import { ensureLocalProfile } from '#lib/auth';
import { produceStream } from '#lib/sse';

export const Param = z.object({
  eventId: z.string(),
});

export const Query = z.object({
  occurrence: z.string().optional(),
});

// Display-only entries keyed by profile id — exactly what
// currentWaitingRoom parses out of Redis (joinWaitingRoom stores only
// { displayName }), the contract realtime.md documents for this stream.
// Strict, so the declared schema cannot silently re-advertise a fuller
// payload than is stored.
export const Stream = z.record(z.string(), jamWaitingRoomEntrySchema.strict());

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Query, Stream, Error }).handle(
  async (param, event) => {
    const jamEvent = await findJamEvent(param.eventId);

    if (!jamEvent) {
      throw notFound(`Post with id ${param.eventId}`);
    }

    const currentProfile = await ensureLocalProfile(event);

    if (!canModerateJam(currentProfile, jamEvent)) {
      throw forbidden();
    }

    return produceStream<z.infer<typeof Stream>>({
      start: async ({ emit }) =>
        currentWaitingRoomWatch(
          jamEvent,
          (waitingRoom: Record<string, { displayName?: string }>) => {
            emit(waitingRoom);
          },
          parseOccurrenceQuery(param.occurrence),
        ),
    });
  },
);
