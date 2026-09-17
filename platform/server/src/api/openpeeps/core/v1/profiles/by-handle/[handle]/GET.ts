import { endpoint, z } from '#lib/endpoint';
import { findProfileByHandle } from '@openpeepshq/core/profiles';
import type { RequestEvent } from '@riddl/core';
import { publicProfileSchema } from '@openpeepshq/common/types';
import { ensureAccess } from '#lib/auth';
import { notFound } from '#lib/errors';
import { publicProfileForViewer } from '#lib/handlers/profile/block';

export const Output = publicProfileSchema;
export const Param = z.object({
  handle: z.string(),
});

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureAccess(event);

    const requestedProfile = await findProfileByHandle(param.handle);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.handle}`);
    }

    return publicProfileForViewer(
      event,
      requestedProfile,
      `Profile with id ${param.handle}`,
    );
  },
);
