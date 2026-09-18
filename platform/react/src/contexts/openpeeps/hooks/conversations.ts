import type { OpenpeepsClient } from '@openpeepshq/client';
import type {
  PostCreationData,
  PublicPost,
  SuccessFailureResponse,
} from '@openpeepshq/common';
import type { UseQueryResult } from '@tanstack/react-query';
import { apiHook, payloadMutation } from '../helpers';

type Query<T> = UseQueryResult<T, SuccessFailureResponse>;

export type ConversationHooks = {
  useConversations: () => Query<PublicPost[][]>;
  useConversation: (id: string) => Query<PublicPost[]>;
  createConversationPostAction: (defaultPathParams?: {
    id: string;
  }) => (input: PostCreationData) => Promise<PublicPost>;
};

export const conversationHooks = (
  client: OpenpeepsClient,
): ConversationHooks => ({
  useConversations: () => apiHook(client.conversations.list),
  useConversation: (id: string) =>
    apiHook(client.conversations.findById, { pathParams: { id } }),
  createConversationPostAction: payloadMutation(client.conversations.newPost, [
    ['conversations'],
  ]),
});
