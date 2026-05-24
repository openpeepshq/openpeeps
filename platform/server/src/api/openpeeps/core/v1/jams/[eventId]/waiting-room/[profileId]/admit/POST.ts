import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden } from '#lib/errors';
import { canModerateJam } from '@openpeeps/common/lib';
import { acceptFromWaitingRoom, findJamEvent } from '@openpeeps/core/jams';
import { ensureLocalProfile } from '#lib/auth';
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

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
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
