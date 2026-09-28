import { endpoint, z } from '#lib/endpoint';
import { adminProfileSummarySchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import type { RequestEvent } from '@riddl/core';
import { ensureRoleCapabilities } from '#lib/auth';
import { findProfile, getAdminProfileSummary } from '@openpeepshq/core/profiles';

export const Param = z.object({
  profileId: z.string(),
});

export const Output = adminProfileSummarySchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-profiles-read']);

    const profile = await findProfile(param.profileId);
    if (!profile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    return getAdminProfileSummary(event.context.authData, param.profileId);
  },
);
