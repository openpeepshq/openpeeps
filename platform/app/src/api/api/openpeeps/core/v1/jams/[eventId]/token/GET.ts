import { Endpoint, z } from 'sveltekit-api';
import { config } from '@openpeeps/core/config';
import { notFound, forbidden } from '$lib/server/api/errors';
import { canModerateJam } from '@openpeeps/common/lib';
import { createJamToken, findJamEvent } from '@openpeeps/core/jams';
import { ensurePostCapabilities, ensureProfileOrGuest } from '$lib/server/auth';
import { jamTokenResponseSchema } from '@openpeeps/common/types';
import { jamFromEvent } from '@openpeeps/common/lib';

export const Param = z.object({
  eventId: z.string(),
});

export const Output = jamTokenResponseSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const { jams } = await config();

    const jamEvent = await findJamEvent(param.eventId);
    if (!jamEvent) {
      throw notFound(`Post with id ${param.eventId}`);
    }

    await ensurePostCapabilities(event, jamEvent, ['core-posts-read']);

    const jam = jamFromEvent(jamEvent);

    if (!jam) {
      throw notFound(`Jam with id ${param.eventId}`);
    }

    const currentProfile = await ensureProfileOrGuest(event, 'read', {
      type: 'jams',
      id: jamEvent.id,
    });


    if (jam.waitingRoom && !canModerateJam(currentProfile, jamEvent)) {
      throw forbidden();
    }

    const token = await createJamToken(jamEvent, currentProfile);

    return { success: true, token, livekitUrl: jams.livekit.url };
  },
);
