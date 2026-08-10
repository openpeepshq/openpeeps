import type {
    FetchClient,
    noPayloadEventSource,
} from '@openpeepshq/fetch-client';
import type {
    MediaAttachment,
    MediaProgressEvent,
    MediaStorageRequestInput,
    SuccessResponse,
} from '@openpeepshq/common';
import {
    allpeepNoPayloadEndpoint,
    allpeepPayloadEndpoint,
    allpeepPayloadProgressObserverEndpoint,
} from './helpers';

export const media = (
    rawClient: FetchClient,
    eventSource: ReturnType<typeof noPayloadEventSource>,
) => ({
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
    /**
     * Same as `create` but routes through XHR so callers can pass
     * `onUploadProgress` to receive byte-level upload events. Returns either a
     * fully-processed `MediaAttachment` (small files, sync path) or a partial
     * one with `status: 'processing'` (large files, async path) — pair with
     * `progress.listen` to track the background processing phase.
     */
    createWithProgress: allpeepPayloadProgressObserverEndpoint<
        MediaAttachment,
        MediaStorageRequestInput
    >(rawClient, '/media', 'post', true),
    delete: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
        rawClient,
        '/media/:id',
        'delete',
    ),
    progress: {
        listen: eventSource<MediaProgressEvent, { id: string }>(
            '/media/:id/progress',
        ),
    },
});
