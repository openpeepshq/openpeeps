import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicProfileSchema } from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { forbidden } from '#lib/errors';
import { isBlockedPair } from '@openpeepshq/common/lib';

export const Output = publicProfileSchema.array();

export const Error = {
  403: forbidden(),
};

export const Query = z.object({
  limit: z.coerce.number().optional(),
  start: z.string().optional(),
});

export const apiEndpoint = endpoint({ Output, Error, Query }).handle(
  async (param, event: RequestEvent) => {
    const viewer = await ensureLocalProfile(event);
    return Output.parse(
      viewer.following.filter(
        (profile) => !isBlockedPair(viewer, profile.id),
      ),
    );
  },
);
