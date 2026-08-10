import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden } from '#lib/errors';
import { canModerateJam } from '@openpeepshq/common/lib';
import { currentWaitingRoomWatch, findJamEvent } from '@openpeepshq/core/jams';
import { ensureLocalProfile } from '#lib/auth';
import { produceStream } from '#lib/sse';

export const Param = z.object({
  eventId: z.string(),
});

export const Stream = z.record(
  z.string(),
  z.object({ displayName: z.string().optional() }),
);

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Stream, Error }).handle(
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
        ),
    });
  },
);
