import { Endpoint, z } from 'sveltekit-api';
import { notFound, forbidden } from '$lib/server/api/errors';
import { closeJam, findJamEvent } from '@openpeeps/core/jams';
import { successResponseSchema, type SuccessResponse } from '@openpeeps/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';

export const Param = z.object({
  eventId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const profile = await ensureLocalProfile(event);

    const jamEvent = await findJamEvent(param.eventId);

    if (!jamEvent) {
      throw notFound(`Object with id ${param.eventId}`);
    }
    if (jamEvent.profile.id === profile.id) {
      await closeJam(profile, jamEvent);
    } else {
      await ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);
      await closeJam(profile, jamEvent);
    }

    return { success: true } as SuccessResponse;
  },
);
