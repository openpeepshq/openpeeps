import { ensurePostCapabilities, ensureProfileOrGuest, scopeMatches } from '#lib/auth';
import { endpoint, z } from '#lib/endpoint';
import { jamStateSchema } from '@openpeeps/common';
import { findPost } from '@openpeeps/core/posts';
import { notFound, forbidden } from '#lib/errors';
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

export const apiEndpoint = endpoint({ Output, Param, Error }).handle(
  async (input, event) => {
    const jamEvent = await findPost(input.eventId);
    if (!jamEvent) {
      throw notFound(`Jam with id ${input.eventId} not found`);
    }

    const isServiceAuthorized = scopeMatches({
      authorization: event.context.authorization,
      scope: undefined,
      resource: { type: 'jam', id: input.eventId },
    });

    const profile =
      isPublic(jamEvent) || isServiceAuthorized
        ? event.context.currentProfile
        : await ensureProfileOrGuest(event, 'read', {
            type: 'jam',
            id: input.eventId,
          });

    if (!isServiceAuthorized) {
      await ensurePostCapabilities(event, jamEvent, ['core-posts-read']);
    }

    const state = await findJamState(jamEvent, !(profile || isServiceAuthorized));

    return state;
  },
);
