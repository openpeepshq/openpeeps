import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
  DirectMessageSearchHit,
  PublicPost,
  PostCreationData,
  SuccessResponse,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';
import type {
  OpenpeepsNoPayloadEndpoint,
  OpenpeepsPayloadEndpoint,
} from '../types';

type Conversations = {
  list: OpenpeepsNoPayloadEndpoint<PublicPost[][]>;
  findById: OpenpeepsNoPayloadEndpoint<
    PublicPost[],
    { id: string },
    { message?: string }
  >;
  search: OpenpeepsNoPayloadEndpoint<
    DirectMessageSearchHit[],
    undefined,
    { q: string; conversationId?: string }
  >;
  newPost: OpenpeepsPayloadEndpoint<
    PublicPost,
    PostCreationData,
    { id: string }
  >;
  leave: OpenpeepsNoPayloadEndpoint<SuccessResponse, { id: string }>;
  archived: OpenpeepsNoPayloadEndpoint<PublicPost[][]>;
};

export const conversations = (rawClient: FetchClient): Conversations => ({
  list: allpeepNoPayloadEndpoint<PublicPost[][]>(rawClient, '/conversations'),
  findById: allpeepNoPayloadEndpoint<
    PublicPost[],
    { id: string },
    { message?: string }
  >(rawClient, '/conversations/:id'),
  search: allpeepNoPayloadEndpoint<
    DirectMessageSearchHit[],
    undefined,
    { q: string; conversationId?: string }
  >(rawClient, '/conversations/search'),
  newPost: allpeepPayloadEndpoint<PublicPost, PostCreationData, { id: string }>(
    rawClient,
    '/conversations/:id/posts',
  ),
  leave: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
    rawClient,
    '/conversations/:id/leave',
    'delete',
  ),
  archived: allpeepNoPayloadEndpoint<PublicPost[][]>(
    rawClient,
    '/conversations/archived',
  ),
});
