import type { OpenpeepsClient } from '@openpeepshq/client';
import type {
  DirectMessageSearchHit,
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
  useConversation: (id: string, messageId?: string) => Query<PublicPost[]>;
  useSearchDirectMessages: (
    q: string,
    conversationId?: string,
  ) => Query<DirectMessageSearchHit[]>;
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
  useConversation: (id: string, messageId?: string) =>
    apiHook(client.conversations.findById, {
      pathParams: { id },
      queryParams: messageId ? { message: messageId } : undefined,
    }),
  useSearchDirectMessages: (q: string, conversationId?: string) =>
    apiHook(client.conversations.search, {
      queryParams: conversationId ? { q, conversationId } : { q },
      enabled: q.trim().length >= 2,
    }),
  createConversationPostAction: payloadMutation(client.conversations.newPost, [
    ['conversations'],
  ]),
  leaveConversationAction: noPayloadMutation(
    client.conversations.leave ?? (async () => ({ success: true })),
    [['conversations'], ['profiles', 'current']],
  ),
});
