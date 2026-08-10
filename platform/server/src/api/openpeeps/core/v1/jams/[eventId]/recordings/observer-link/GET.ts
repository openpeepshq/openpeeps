import { endpoint, z } from '#lib/endpoint';
import { forbidden, authNeeded } from '#lib/errors';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findJamEvent, getJamObserverPath } from '@openpeepshq/core/jams';
import { jamObserverResponseSchema } from '@openpeepshq/common/types';
import { notFound } from '#lib/helpers';

export const Output = jamObserverResponseSchema.optional();
export const Param = z.object({
  eventId: z.string(),
});
export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
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
