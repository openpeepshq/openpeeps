import type { FetchClient } from '@openpeeps/fetch-client';
import type {
    MediaAttachment,
    MediaStorageRequestInput,
    SuccessResponse,
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const media = (rawClient: FetchClient) => ({
    list: allpeepNoPayloadEndpoint<MediaAttachment[]>(
        rawClient,
        '/media',
    ),
    findById: allpeepNoPayloadEndpoint<MediaAttachment, { id: string }>(
        rawClient,
        '/media/:id',
    ),
    create: allpeepPayloadEndpoint<MediaAttachment, MediaStorageRequestInput>(
        rawClient,
        '/media',
        'post',
        true,
    ),
    delete: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
        rawClient,
        '/media/:id',
        'delete',
    ),
}); 