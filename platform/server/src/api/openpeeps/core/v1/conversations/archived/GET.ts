import { endpoint } from '#lib/endpoint';
import { publicPostSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listLeftConversations } from '@openpeepshq/core/posts';
import { ensureLocalProfile, ensureScope } from '#lib/auth';

export const Output = publicPostSchema.array().array();

// Intentionally uncapped: same contract as the active conversation list
// (GET /conversations). Both are all-or-nothing today because this Riddl
// route accepts no paging Input (Query); if paging is ever introduced it
// must land on both lists in the same change to keep that parity claim true.
export const apiEndpoint = endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureLocalProfile(event);
    await ensureScope(event, 'read', { type: 'conversations' });
    return listLeftConversations(event.context.authData);
  },
);
