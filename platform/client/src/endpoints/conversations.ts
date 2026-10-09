import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
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
  findById: OpenpeepsNoPayloadEndpoint<PublicPost[], { id: string }>;
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
  findById: allpeepNoPayloadEndpoint<PublicPost[], { id: string }>(
    rawClient,
    '/conversations/:id',
  ),
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
