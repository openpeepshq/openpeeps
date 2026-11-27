import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { auditAction } from '#lib/audit';
import { updateConfigValues } from '@openpeepshq/core/config';

export const Input = z.object({
  postId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-customization-update']);
    await updateConfigValues(
      { content: { pinnedPost: input.postId } },
      'openpeeps',
      'community',
    );

    if (event.context.currentProfile) {
      // An empty postId clears the pinned post (unpin); otherwise it pins.
      void auditAction(event, event.context.currentProfile, {
        action: input.postId ? 'post.pin' : 'post.unpin',
        targetType: 'post',
        targetId: input.postId || null,
      });
    }

    return { success: true };
  },
);
