import type { FetchClient } from '@openpeeps/fetch-client';
import type {
    MediaStream,
    MediaStreamRequest,
} from '@openpeeps/common';
import {
    allpeepNoPayloadEndpoint,
    allpeepPayloadEndpoint,
} from './helpers';

export const streaming = (rawClient: FetchClient) => ({
    vod: {
        /**
         * Request that an HLS VOD stream be produced for a media URL hosted on
         * this server. Idempotent: returns the existing stream's status when
         * called again with the same source URL.
         */
        create: allpeepPayloadEndpoint<MediaStream, MediaStreamRequest>(
            rawClient,
            '/streaming/vod',
            'post',
        ),
        /** Polls the current status of a previously-created VOD stream. */
        status: allpeepNoPayloadEndpoint<MediaStream, { storageId: string }>(
            rawClient,
            '/streaming/vod/:storageId/status',
        ),
    },
});
