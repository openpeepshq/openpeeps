import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import type { RequestEvent } from '@sveltejs/kit';
import { jamTokenResponseSchema } from '@openpeeps/common/types';
import { config } from '@openpeeps/core/config';
import { admittanceWatch, findJamEvent, joinWaitingRoom } from '@openpeeps/core/jams';
import { produceStream } from '$lib/server/api/sse';
import { ensureProfileOrGuest } from '$lib/server/auth';
import { jamFromEvent } from '@openpeeps/common/lib';
export const Stream = jamTokenResponseSchema;
export const Output = z.instanceof(ReadableStream);
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Param, Stream, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureProfileOrGuest(event, 'read', {
      type: 'jams',
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

    await joinWaitingRoom(jamEvent, profile);

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
