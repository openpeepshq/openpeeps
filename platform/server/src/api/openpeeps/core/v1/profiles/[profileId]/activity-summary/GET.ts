import { endpoint, z } from '#lib/endpoint';
import {
  findProfile,
  getProfileActivitySummary,
} from '@openpeepshq/core/profiles';
import type { RequestEvent } from '@riddl/core';
import { profileActivitySummarySchema } from '@openpeepshq/common/types';
import { ensureAccess } from '#lib/auth';
import { forbidden, notFound } from '#lib/errors';

export const Output = profileActivitySummarySchema;
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureAccess(event);

    const requestedProfile = await findProfile(param.profileId);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    const me = event.context.authData.profile;
    if (!me || me.id !== requestedProfile.id) {
      throw forbidden();
    }

    return getProfileActivitySummary(
      event.context.authData,
      requestedProfile.id,
    );
  },
);
