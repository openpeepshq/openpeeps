import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicPostSchema } from '@openpeeps/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded, forbidden } from '#lib/errors';
import { listPostsByProfile } from '@openpeeps/core/posts';

export const Output = publicPostSchema.array();

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    return listPostsByProfile(
      event.context.authData,
      currentProfile,
      { limit: 1000 },
    )
      .then(posts => posts.filter(p => p.repost && publicPostSchema.safeParse(p).success));
  },
);
