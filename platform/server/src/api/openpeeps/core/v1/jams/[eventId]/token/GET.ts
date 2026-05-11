import { endpoint, z } from '#lib/endpoint';
import { config } from '@openpeeps/core/config';
import { notFound, forbidden } from '#lib/errors';
import { canModerateJam } from '@openpeeps/core/auth';
import { createJamToken, findJamEvent, createJamEgressToken } from '@openpeeps/core/jams';
import { ensurePostCapabilities, ensureProfileOrGuest, serviceScopeMatches } from '#lib/auth';
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

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const { jams } = await config();

    const jamEvent = await findJamEvent(param.eventId);
    if (!jamEvent) {
      throw notFound(`Post with id ${param.eventId}`);
    }

    if (serviceScopeMatches({
      authorization: event.context.authorization,
      scope: undefined,
      resource: { type: 'jam', id: param.eventId },
    })) {
      return { success: true, token: await createJamEgressToken(jamEvent), livekitUrl: jams.livekit.url };
    }

    await ensurePostCapabilities(event, jamEvent, ['core-posts-read']);

    const jam = jamFromEvent(jamEvent);

    if (!jam) {
      throw notFound(`Jam with id ${param.eventId}`);
    }

    const currentProfile = await ensureProfileOrGuest(event, 'read', {
      type: 'jam',
      id: jamEvent.id,
    });


    if (jam.waitingRoom && !(await canModerateJam(currentProfile)(jamEvent))) {
      throw forbidden();
    }

    const token = await createJamToken(jamEvent, currentProfile);

    return { success: true, token, livekitUrl: jams.livekit.url };
  },
);
