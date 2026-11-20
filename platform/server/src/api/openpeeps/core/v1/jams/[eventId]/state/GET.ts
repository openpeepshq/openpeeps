import {
  ensurePostCapabilities,
  ensureProfileOrGuest,
  serviceScopeMatches,
} from '#lib/auth';
import { endpoint, z } from '#lib/endpoint';
import { jamStateSchema } from '@openpeepshq/common';
import { isPublicJamPost, parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { findPostsForAuth } from '@openpeepshq/core/posts';
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
      throw notFound(`Jam with id ${input.eventId}`);
    }

    const isServiceAuthorized = serviceScopeMatches({
      authorization: event.context.authorization,
      scopeLevel: undefined,
      resource: { type: 'jams', id: input.eventId },
    });

    // Signed-out visitors may read the state of a public jam post (it drives
    // the join CTA / waiting-room notice); any other public post still
    // requires a profile, so the anonymous short-circuit is jam-only.
    const publicJam = isPublicJamPost(jamEvent);

    const profile =
      publicJam || isServiceAuthorized
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
