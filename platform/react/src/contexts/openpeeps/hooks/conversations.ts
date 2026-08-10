import type { OpenpeepsClient } from '@openpeepshq/client';
import { apiHook, payloadMutation } from '../helpers';

export type ConversationHooks = ReturnType<typeof conversationHooks>;

export const conversationHooks = (client: OpenpeepsClient) => ({
  useConversations: () => apiHook(client.conversations.list),
  useConversation: (id: string) =>
    apiHook(client.conversations.findById, { pathParams: { id } }),
  createConversationPostAction: payloadMutation(
    client.conversations.newPost,
    [['conversations']],
  ),
});
