import { endpoint } from '#lib/endpoint';
import { hashtagSchema } from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded } from '#lib/errors';
import { listFollowedHashtags } from '@openpeepshq/core/hashtags';

export const Output = hashtagSchema.array();

export const Error = {
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_: unknown, event) => {
    const profile = await ensureLocalProfile(event);
    return listFollowedHashtags(profile);
  },
);
