import { ensurePostCapabilities, ensureProfileOrGuest } from '$lib/server/auth';
import { Endpoint, z } from 'sveltekit-api';
import { jamStateSchema } from '@openpeeps/common';
import { findPost } from '@openpeeps/core/posts';
import { notFound, forbidden } from '$lib/server/api/errors';
import { findJamState } from '@openpeeps/core/jams';
import { isPublic } from '@openpeeps/core/posts/helpers';

export const Param = z.object({
  eventId: z.string(),
});

export const Output = jamStateSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Output, Param, Error }).handle(
  async (input, event) => {
    const jamEvent = await findPost(input.eventId);
    if (!jamEvent) {
      throw notFound(`Jam with id ${input.eventId} not found`);
    }

    await ensurePostCapabilities(event, jamEvent, ['core-posts-read']);

    const state = await findJamState(jamEvent, !(event.locals.currentProfile || event.locals.authorization.identities.service));

    return state;
  },
);
