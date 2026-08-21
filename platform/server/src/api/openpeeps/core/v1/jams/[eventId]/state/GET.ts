import {
  ensurePostCapabilities,
  ensureProfileOrGuest,
  scopeMatches,
} from '#lib/auth';
import { endpoint, z } from '#lib/endpoint';
import { jamStateSchema } from '@openpeepshq/common';
import { parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { findPostsForAuth, isPublic } from '@openpeepshq/core/posts';
import { notFound, forbidden } from '#lib/errors';
import { findJamState } from '@openpeepshq/core/jams';

export const Param = z.object({
  eventId: z.string(),
});

export const Query = z.object({
  occurrence: z.string().optional(),
});

export const Output = jamStateSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Param, Query, Error }).handle(
  async (input, event) => {
    const [jamEvent] = await findPostsForAuth([input.eventId]);
    if (!jamEvent) {
      throw notFound(`Jam with id ${input.eventId} not found`);
    }

    const isServiceAuthorized = scopeMatches({
      authorization: event.context.authorization,
      scope: undefined,
      resource: { type: 'jams', id: input.eventId },
    });

    const profile =
      isPublic(jamEvent) || isServiceAuthorized
        ? event.context.currentProfile
        : await ensureProfileOrGuest(event, 'read', {
            type: 'jams',
            id: input.eventId,
          });

    if (!isServiceAuthorized) {
      await ensurePostCapabilities(event, jamEvent, ['core-posts-read']);
    }

    const state = await findJamState(
      jamEvent,
      !(profile || isServiceAuthorized),
      parseOccurrenceQuery(input.occurrence),
    );

    return state;
  },
);
