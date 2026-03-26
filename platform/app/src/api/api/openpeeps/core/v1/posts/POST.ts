import { Endpoint } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import {
  publicPostSchema,
  postDataUnionSchema,
  postDataSchema,
} from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { createPost } from '@openpeeps/core/posts';
import { postCreationDataSchema } from '@openpeeps/common/types';
import { canCreatePost } from '@openpeeps/common/lib';
import { findGroup } from '@openpeeps/core/groups';

export const Input = postCreationDataSchema;
export const Output = publicPostSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postData = postDataUnionSchema.parse(input.data);
    const object = postDataSchema.parse({ ...input, creatorId: profile.id });
    const { inReplyToId, mentions, groupId, audience } = input;

    if (postData.type !== object.type) {
      object.type = postData.type;
    }

    if (!canCreatePost(profile, object.type, object.visibility, (groupId && await findGroup(groupId)) || undefined)) {
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
