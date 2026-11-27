import { endpoint } from '#lib/endpoint';
import {
  badRequest,
  forbidden,
  notFound,
  rethrowIfOpenpeepsError,
  unprocessableRequest,
} from '#lib/errors';
import {
  publicPostSchema,
  postDataInputUnionSchema,
  postDataSchema,
} from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { createPost } from '@openpeepshq/core/posts';
import { postCreationDataSchema } from '@openpeepshq/common/types';
import {
  canCreatePost,
  validResourceCategoryPath,
} from '@openpeepshq/common/lib';
import { findGroup } from '@openpeepshq/core/groups';

export const Input = postCreationDataSchema;
export const Output = publicPostSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
  404: notFound(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postData = postDataInputUnionSchema.parse(input.data);
    if (
      postData.type === 'resource' &&
      !validResourceCategoryPath(postData.categoryPath)
    ) {
      throw badRequest('invalidCategoryPath');
    }
    const object = postDataSchema.parse({ ...input, creatorId: profile.id });
    const { inReplyToId, mentions, groupId, audience, draft } = input;

    if (postData.type !== object.type) {
      object.type = postData.type;
    }

    if (
      !canCreatePost(
        event.context.authData,
        object.type,
        object.visibility,
        (groupId && (await findGroup(groupId))) || undefined,
      )
    ) {
      throw forbidden('postCreateForbidden');
    }

    return await createPost(postData, profile, object, {
      inReplyToId,
      mentions,
      groupId,
      audience,
      draft,
    }).catch(rethrowIfOpenpeepsError);
  },
);
