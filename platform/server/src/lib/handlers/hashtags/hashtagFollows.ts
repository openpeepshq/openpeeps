import type { SuccessResponse } from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/helpers';
import {
  findHashtagByTag,
  findOrCreateHashtag,
  followHashtag,
  unfollowHashtag,
} from '@openpeepshq/core/hashtags';

export const hashtagParamSchema = z.object({
  tag: z.string(),
});

export type HashtagParams = z.infer<typeof hashtagParamSchema>;

export const followHashtagHandler = async (
  input: HashtagParams,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  const profile = await ensureLocalProfile(event);
  const hashtag = await findOrCreateHashtag(input.tag);
  await followHashtag(profile, hashtag);
  return { success: true };
};

export const unfollowHashtagHandler = async (
  input: HashtagParams,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  const profile = await ensureLocalProfile(event);
  const hashtag = await findHashtagByTag(input.tag);
  if (!hashtag) {
    throw notFound(`hashtag ${input.tag}`);
  }
  await unfollowHashtag(profile, hashtag);
  return { success: true };
};
