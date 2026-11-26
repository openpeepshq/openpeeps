import { endpoint, z } from '#lib/endpoint';
import {
  authNeeded,
  forbidden,
  notFound,
  rethrowIfOpenpeepsError,
} from '#lib/errors';
import { successResponseSchema } from '@openpeepshq/common/types';
import { ensureProfileOrGuest } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { deleteJamEvent, findJamEvent } from '@openpeepshq/core/jams';

export const Param = z.object({
  eventId: z.string(),
  eventJamEventId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  401: authNeeded(),
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam');
    }

    // Same identity gate as the create route: a local profile or a
    // guest holding a read pass for this jam. The authorization itself
    // (host / moderator / author) is enforced in the core mutation.
    const profile = await ensureProfileOrGuest(event, 'read', {
      type: 'jams',
      id: jamEvent.id,
    });

    await deleteJamEvent(
      profile.id,
      input.eventId,
      input.eventJamEventId,
    ).catch(rethrowIfOpenpeepsError);

    return { success: true };
  },
);
