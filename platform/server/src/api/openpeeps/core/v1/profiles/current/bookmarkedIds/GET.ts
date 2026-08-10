import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded, forbidden } from '#lib/errors';
import { listBookmarkedPostIds } from '@openpeepshq/core/posts';

export const Output = z.array(z.string());

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    return listBookmarkedPostIds(currentProfile);
  },
);
