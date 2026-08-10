import type { FetchClient } from '@openpeepshq/fetch-client';
import type { PublicPost, PostCreationData } from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const conversations = (rawClient: FetchClient) => ({
    list: allpeepNoPayloadEndpoint<PublicPost[][]>(
        rawClient,
        '/conversations',
    ),
    findById: allpeepNoPayloadEndpoint<PublicPost[], { id: string }>(
        rawClient,
        '/conversations/:id',
    ),
    newPost: allpeepPayloadEndpoint<PublicPost, PostCreationData, { id: string }>(
        rawClient,
        '/conversations/:id/posts',
    ),
}); 