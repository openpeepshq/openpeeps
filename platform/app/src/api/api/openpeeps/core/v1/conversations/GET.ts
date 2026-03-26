import { Endpoint } from 'sveltekit-api';
import { publicPostSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { getConversationByEnd, listConversationLeaves } from '@openpeeps/core/posts';
import { ensureLocalProfile } from '$lib/server/auth';
import { getUniqueBy } from '@openpeeps/common/lib';

export const Output = publicPostSchema.array().array();

export default new Endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const lastPosts = await listConversationLeaves(profile);

    return Promise.all(
      lastPosts.map((post) => getConversationByEnd(post, profile)),
    ).then((conversations) =>
      getUniqueBy(conversations, (conversation) => conversation[0].id),
    );
  },
);
