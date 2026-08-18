import { endpoint } from '#lib/endpoint';
import { publicPostSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listConversationPreviews } from '@openpeepshq/core/posts';
import { ensureLocalProfile } from '#lib/auth';

export const Output = publicPostSchema.array().array();

export const apiEndpoint = endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureLocalProfile(event);
    return listConversationPreviews(event.context.authData);
  },
);
