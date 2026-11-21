import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import {
  type PostWithMeta,
  publicPostSchema,
  type PostData,
} from '@openpeepshq/common/types';
import {
  ensureGroupCapabilities,
  ensureLocalProfile,
  ensureRoleCapabilities,
} from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { createPost, findPost } from '@openpeepshq/core/posts';
import { findGroup } from '@openpeepshq/core/groups';

export const Output = publicPostSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Input = z.object({
  // Repost into a group the member can post to; the group capability is
  // checked server-side so a crafted client can't bypass the audience picker.
  groupId: z.uuid().optional(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param, Input, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const postToRepost: PostWithMeta | undefined = await findPost(input.postId);

    if (!postToRepost) {
      throw notFound(`Post with id ${input.postId}`);
    }

    if (postToRepost.group) {
      await ensureGroupCapabilities(
        event,
        [`core-posts-create-${postToRepost.type}`],
        postToRepost.group,
      );
    } else {
      await ensureRoleCapabilities(event, [
        `core-posts-create-${postToRepost.type}-${postToRepost.visibility}`,
      ]);
    }

    let targetGroupId = postToRepost?.groupId || undefined;
    if (input.groupId) {
      const targetGroup = await findGroup(input.groupId);
      if (!targetGroup) {
        throw notFound(`Group with id ${input.groupId}`);
      }
      await ensureGroupCapabilities(
        event,
        ['core-posts-create-note'],
        targetGroup,
      );
      targetGroupId = input.groupId;
    }

    const post: PostData = {
      type: 'note',
      visibility: postToRepost.visibility,
      creatorId: profile.id,
    };

    return await createPost({ type: 'note' }, profile, post, {
      repostId: postToRepost?.id,
      groupId: targetGroupId,
      // Never carry the source post's audience into a group-targeted repost:
      // `audience` edges grant read/reply (via the default capabilities
      // config), so a DM participant would gain access to a group post and
      // its reply subtree outside the target group's membership model.
      // Source-group reposts keep their source visibility, so the carry-over
      // stays behavior-identical for the original path.
      audience: input.groupId ? undefined : postToRepost?.audience || undefined,
    });
  },
);
