import { endpoint, z } from '#lib/endpoint';
import {
  findProfileByHandle,
  getProfileByHandle,
} from '@openpeepshq/core/profiles';
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

    // Deactivated members are soft-deleted; ignore the soft-delete filter so
    // the handle route renders the tombstone instead of 404ing.
    const requestedProfile =
      (await findProfileByHandle(param.handle)) ??
      (await getProfileByHandle(param.handle, true));

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
