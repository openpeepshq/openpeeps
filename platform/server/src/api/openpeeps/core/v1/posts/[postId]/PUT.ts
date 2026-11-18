import { endpoint, z } from '#lib/endpoint';
import { badRequest, forbidden, notFound } from '#lib/errors';
import {
  publicPostSchema,
  postDataInputUnionSchema,
} from '@openpeepshq/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { updatePost, findPost } from '@openpeepshq/core/posts';
import {
  validResourceCategoryPath,
  categoryPathKey,
} from '@openpeepshq/common/lib';

export const Input = postDataInputUnionSchema;
export const Output = publicPostSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  400: badRequest(),
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postToUpdate = await findPost(input.postId);

    if (!postToUpdate) {
      throw notFound(`Post with id ${input.postId}`);
    }

    await ensurePostCapabilities(event, postToUpdate, ['core-posts-update']);

    const postData = postDataInputUnionSchema.parse(input);
    if (postData.type === 'resource') {
      // Legacy rows may hold whitespace-padded segments (pre-validation data);
      // only enforce the strict gate when the folder path itself is being edited.
      const storedPath =
        postToUpdate.data?.type === 'resource'
          ? postToUpdate.data.categoryPath
          : undefined;
      const pathUnchanged =
        categoryPathKey(storedPath ?? []) ===
        categoryPathKey(postData.categoryPath ?? []);
      if (!pathUnchanged && !validResourceCategoryPath(postData.categoryPath)) {
        throw badRequest('invalidCategoryPath');
      }
    }

    return await updatePost(postToUpdate, profile, postData);
  },
);
