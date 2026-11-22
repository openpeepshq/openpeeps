import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden } from '#lib/errors';
import { findJamEvent, liftJamBan } from '@openpeepshq/core/jams';
import { ensureLocalProfile, ensureJamModeration } from '#lib/auth';
import { successResponseSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';

export const Param = z.object({
  eventId: z.string(),
  profileId: z.string().uuid(),
});

export const Output = successResponseSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureLocalProfile(event);
    const jamEvent = await findJamEvent(param.eventId);

    if (!jamEvent) {
      throw notFound(`Jam with id ${param.eventId}`);
    }

    await ensureJamModeration(event, jamEvent);

    await liftJamBan(jamEvent, param.profileId);
    return { success: true };
  },
);
