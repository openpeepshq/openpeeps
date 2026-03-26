import { Endpoint, z } from 'sveltekit-api';
import { deleteProfile, findProfile } from '@openpeeps/core/profiles';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { forbidden, notFound } from '$lib/server/api/errors';
import { successResponseSchema } from '@openpeeps/common/types';

export const Output = successResponseSchema;
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-profiles-delete']);

    const requestedProfile = await findProfile(param.profileId);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    await deleteProfile(param.profileId);

    return { success: true };
  },
);
