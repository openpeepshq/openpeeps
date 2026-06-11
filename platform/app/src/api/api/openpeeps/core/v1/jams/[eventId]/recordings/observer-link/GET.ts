import { Endpoint, z } from 'sveltekit-api';
import { forbidden, authNeeded } from '$lib/server/api/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { findJamEvent, getJamObserverPath } from '@openpeeps/core/jams';
import { jamObserverResponseSchema } from '@openpeeps/common/types';
import { notFound } from '$lib/server/helpers';

export const Output = jamObserverResponseSchema.optional();
export const Param = z.object({
  eventId: z.string(),
});
export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam not found');
    }

    await ensureLocalProfile(event);

    ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);

    const path = await getJamObserverPath(input.eventId);

    return { path };


  }
);
