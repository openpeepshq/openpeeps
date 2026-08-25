import type { OpenpeepsClient } from '@openpeepshq/client';
import { apiHook, payloadMutation } from '../helpers';

export type ConversationHooks = ReturnType<typeof conversationHooks>;

export const conversationHooks = (client: OpenpeepsClient) => ({
  useConversations: (options?: { enabled?: boolean }) =>
    apiHook(client.conversations.list, { enabled: options?.enabled ?? true }),
  useConversation: (id: string) =>
    apiHook(client.conversations.findById, {
      pathParams: { id },
      enabled: !!id,
    }),
  createConversationPostAction: payloadMutation(client.conversations.newPost, [
    ['conversations'],
  ]),
});
