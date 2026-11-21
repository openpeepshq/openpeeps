import { endpoint, z } from '#lib/endpoint';
import { publicProfileSchema } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import type { RequestEvent } from '@riddl/core';
import { listProfiles } from '@openpeepshq/core/profiles';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

export const Output = publicProfileSchema.array();

export const Query = z.object({ directory: z.enum(['true']).optional() });

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Query, Error }).handle(
  async (input, event: RequestEvent) => {
    const { directory } = input;
    return ensureProfileOrPublicCommunity(event).then((profile) =>
      listProfiles(profile, {
        directoryView: directory === 'true',
      }),
    );
  },
);
