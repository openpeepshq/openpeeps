import type { OpenpeepsClient } from '@openpeepshq/client';
import type {
  PostCreationData,
  PublicPost,
  SuccessFailureResponse,
  SuccessResponse,
} from '@openpeepshq/common';
import type { UseQueryResult } from '@tanstack/react-query';
import { apiHook, payloadMutation, noPayloadMutation } from '../helpers';

type Query<T> = UseQueryResult<T, SuccessFailureResponse>;

export type ConversationHooks = {
  useConversations: () => Query<PublicPost[][]>;
  useArchivedConversations: () => Query<PublicPost[][]>;
  useConversation: (id: string) => Query<PublicPost[]>;
  createConversationPostAction: (defaultPathParams?: {
    id: string;
  }) => (input: PostCreationData) => Promise<PublicPost>;
  leaveConversationAction: (defaultPathParams?: {
    id: string;
  }) => () => Promise<SuccessResponse>;
};

export const conversationHooks = (
  client: OpenpeepsClient,
): ConversationHooks => ({
  useConversations: () => apiHook(client.conversations.list),
  useArchivedConversations: () =>
    client.conversations.archived
      ? apiHook(client.conversations.archived)
      : ({ data: [], isPending: false } as never),
  useConversation: (id: string) =>
    apiHook(client.conversations.findById, { pathParams: { id } }),
  createConversationPostAction: payloadMutation(client.conversations.newPost, [
    ['conversations'],
  ]),
  leaveConversationAction: noPayloadMutation(
    client.conversations.leave ?? (async () => ({ success: true })),
    [['conversations'], ['profiles', 'current']],
  ),
});
