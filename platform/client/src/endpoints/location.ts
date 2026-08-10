import type { FetchClient } from '@openpeepshq/fetch-client';
import type { GeocodingResult } from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint } from './helpers';

export const location = (rawClient: FetchClient) => ({
    geocode: allpeepNoPayloadEndpoint<GeocodingResult[], undefined, { query: string }>(
        rawClient,
        '/location/geocode',
    ),
}); 