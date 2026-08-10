import { endpoint } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import {
  publicPostSchema,
  postDataUnionSchema,
  postDataSchema,
} from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { createPost } from '@openpeepshq/core/posts';
import { postCreationDataSchema } from '@openpeepshq/common/types';
import { canCreatePost } from '@openpeepshq/common/lib';
import { findGroup } from '@openpeepshq/core/groups';

export const Input = postCreationDataSchema;
export const Output = publicPostSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postData = postDataUnionSchema.parse(input.data);
    const object = postDataSchema.parse({ ...input, creatorId: profile.id });
    const { inReplyToId, mentions, groupId, audience } = input;

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
      throw forbidden();
    }

    return await createPost(postData, profile, object, {
      inReplyToId,
      mentions,
      groupId,
      audience,
    });
  },
);
