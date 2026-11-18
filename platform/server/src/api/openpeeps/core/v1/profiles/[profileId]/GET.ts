import { endpoint, z } from '#lib/endpoint';
import { findProfile, getProfile } from '@openpeepshq/core/profiles';
import type { RequestEvent } from '@riddl/core';
import { publicProfileSchema } from '@openpeepshq/common/types';
import { ensureAccess } from '#lib/auth';
import { notFound } from '#lib/errors';
import { publicProfileForViewer } from '#lib/handlers/profile/block';

export const Output = publicProfileSchema;
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureAccess(event);

    // Deactivated members are soft-deleted; look them up again ignoring the
    // soft-delete filter so `publicProfileForViewer` can render the tombstone
    // instead of 404ing (a hard-deleted member has no row and stays 404).
    const requestedProfile =
      (await findProfile(param.profileId)) ??
      (await getProfile(param.profileId, true));

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    return publicProfileForViewer(
      event,
      requestedProfile,
      `Profile with id ${param.profileId}`,
    );
  },
);
