import { endpoint, z } from '#lib/endpoint';
import {
  badRequest,
  forbidden,
  notFound,
  rethrowIfOpenpeepsError,
  unprocessableRequest,
} from '#lib/errors';
import { publicPostSchema } from '@openpeepshq/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findPost, publishPost } from '@openpeepshq/core/posts';

export const Param = z.object({
  postId: z.string(),
});
export const Output = publicPostSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
  404: notFound(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    // Token scopes are enforced exactly as on post creation: publishing goes
    // through `core-posts-update` via `ensurePostCapabilities` (the same
    // capability-based path `canCreatePostTypeIgnoringScopes` documents as
    // being scope-checked by the create endpoints).
    const post = await findPost(param.postId, event.context.authData);
    if (!post) {
      throw notFound(`Post with id ${param.postId}`);
    }

    // Only the author can publish, and only while the post is still a draft.
    // `findPost` (find-by-id) does not apply the published-only default
    // filter, so drafts reach the capability gate; a non-creator there gets
    // 403 because drafts grant post caps solely through the profile `self`
    // relationship. `ensurePostCapabilities` is the single denial point.
    await ensurePostCapabilities(event, post, ['core-posts-update']);

    // `publishPost` throws core `OpenpeepsError`s (already-published 422,
    // non-owner 403); rethrow converts them to their HTTP status like every
    // sibling endpoint that calls a core throwing function.
    return await publishPost(post, profile).catch(rethrowIfOpenpeepsError);
  },
);
