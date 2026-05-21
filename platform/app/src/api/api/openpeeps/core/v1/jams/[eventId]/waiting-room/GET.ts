import { Endpoint, z } from 'sveltekit-api';
import { notFound, forbidden } from '$lib/server/api/errors';
import { canModerateJam } from '@openpeeps/common/lib';
import { currentWaitingRoomWatch, findJamEvent } from '@openpeeps/core/jams';
import { ensureLocalProfile } from '$lib/server/auth';
import { produceStream } from '$lib/server/api/sse';

export const Param = z.object({
  eventId: z.string(),
});

export const Stream = z.record(
  z.string(), z.object({ displayName: z.string().optional() }),
);

export const Output = z.instanceof(ReadableStream);

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Stream, Output, Error }).handle(
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
