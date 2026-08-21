import { parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden } from '#lib/errors';
import { closeJam, findJamEvent } from '@openpeepshq/core/jams';
import {
  successResponseSchema,
  type SuccessResponse,
} from '@openpeepshq/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';

export const Param = z.object({
  eventId: z.string(),
});

export const Query = z.object({
  occurrence: z.string().optional(),
});

export const Output = successResponseSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Query, Output, Error }).handle(
  async (param, event) => {
    const profile = await ensureLocalProfile(event);
    const recurrenceId = parseOccurrenceQuery(param.occurrence);

    const jamEvent = await findJamEvent(param.eventId);

    if (!jamEvent) {
      throw notFound(`Object with id ${param.eventId}`);
    }
    if (jamEvent.profile.id === profile.id) {
      await closeJam(profile, jamEvent, recurrenceId);
    } else {
      await ensurePostCapabilities(event, jamEvent, [
        'core-posts-jam-moderate',
      ]);
      await closeJam(profile, jamEvent, recurrenceId);
    }

    return { success: true } as SuccessResponse;
  },
);
