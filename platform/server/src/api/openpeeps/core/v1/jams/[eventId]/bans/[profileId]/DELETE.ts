import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden } from '#lib/errors';
import { findJamEvent, liftJamBan } from '@openpeepshq/core/jams';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
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
    const profile = await ensureLocalProfile(event);
    const jamEvent = await findJamEvent(param.eventId);

    if (!jamEvent) {
      throw notFound(`Jam with id ${param.eventId}`);
    }

    // Explicit host-or-moderator gate: ensurePostCapabilities early-returns
    // for public jams, so the host is checked directly first (close/PUT.ts).
    if (jamEvent.profile.id !== profile.id) {
      await ensurePostCapabilities(event, jamEvent, [
        'core-posts-jam-moderate',
      ]);
    }

    await liftJamBan(jamEvent, param.profileId);
    return { success: true };
  },
);
