import { endpoint } from '#lib/endpoint';
import { publicPostSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { getConversationByEnd, listConversationLeaves } from '@openpeepshq/core/posts';
import { ensureLocalProfile } from '#lib/auth';
import { getUniqueBy } from '@openpeepshq/common/lib';

export const Output = publicPostSchema.array().array();

export const apiEndpoint = endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureLocalProfile(event);

    const lastPosts = await listConversationLeaves(event.context.authData);

    return Promise.all(
      lastPosts.map((post) => getConversationByEnd(post, event.context.authData)),
    ).then((conversations) =>
      getUniqueBy(conversations, (conversation) => conversation[0].id),
    );
  },
);
