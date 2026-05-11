import type { OpenpeepsClient } from '@openpeeps/client';
import { apiHook, payloadMutation } from '../helpers';

export type ConversationHooks = ReturnType<typeof conversationHooks>;

export const conversationHooks = (client: OpenpeepsClient) => ({
  useConversations: () => apiHook(client.conversations.list),
  useConversation: (id: string) =>
    apiHook(client.conversations.findById, { pathParams: { id } }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createConversationPostAction: payloadMutation(
    client.conversations.newPost as any,
    [['conversations']],
  ),
});
