import { endpoint } from '#lib/endpoint';
import { profileWithMetaSchema } from '@openpeeps/common/types';
import { forbidden } from '#lib/errors';
import type { RequestEvent } from '@riddl/core';
import { listProfiles } from '@openpeeps/core/profiles';
import { ensureLocalProfile, ensureRoleCapabilities } from '#lib/auth';

export const Output = profileWithMetaSchema.array();

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-profiles-read']);
    return listProfiles();
  },
);
