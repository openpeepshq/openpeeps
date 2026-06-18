import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound, rethrowIfOpenpeepsError } from '#lib/errors';
import type { RequestEvent } from '@riddl/core';
import { jamTokenResponseSchema } from '@openpeeps/common/types';
import { config } from '@openpeeps/core/config';
import { admittanceWatch, findJamEvent, joinWaitingRoom } from '@openpeeps/core/jams';
import { produceStream } from '#lib/sse';
import { ensureProfileOrGuest } from '#lib/auth';
import { jamFromEvent } from '@openpeeps/common/lib';
export const Stream = jamTokenResponseSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Stream, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureProfileOrGuest(event, 'read', {
      type: 'jam',
      id: input.eventId,
    });

    const coreConfig = await config();

    const jamEvent = await findJamEvent(input.eventId);

    if (!jamEvent) {
      throw notFound(`Object with id ${input.eventId}`);
    }

    const jam = jamFromEvent(jamEvent);

    if (!jam) {
      throw notFound(`Jam with id ${input.eventId}`);
    }

    await joinWaitingRoom(jamEvent, profile).catch(rethrowIfOpenpeepsError);

    const { jams } = coreConfig;

    return produceStream<z.infer<typeof Stream>>({
      start: ({ emit, stop }) =>
        admittanceWatch(jamEvent, profile.id, (token) => {
          emit({
            success: true,
            token,
            livekitUrl: jams.livekit.url,
          });
          stop();
        }),
    });
  },
);
