import { Endpoint, z } from 'sveltekit-api';
import { notFound, forbidden } from '$lib/server/api/errors';
import { canModerateJam } from '@openpeeps/common/lib';
import { acceptFromWaitingRoom, findJamEvent } from '@openpeeps/core/jams';
import { ensureLocalProfile } from '$lib/server/auth';
import { successResponseSchema } from '@openpeeps/common/types';

export const Param = z.object({
  eventId: z.string(),
  profileId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const jamEvent = await findJamEvent(param.eventId);

    if (!jamEvent) {
      throw notFound(`Jam with id ${param.eventId}`);
    }
    const currentProfile = await ensureLocalProfile(event);

    if (!canModerateJam(currentProfile, jamEvent)) {
      throw forbidden();
    }

    await acceptFromWaitingRoom(jamEvent, param.profileId);
    return { success: true };
  },
);
