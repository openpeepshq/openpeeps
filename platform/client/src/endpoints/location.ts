import type { FetchClient } from '@openpeeps/fetch-client';
import type { GeocodingResult } from '@openpeeps/common';
import { allpeepNoPayloadEndpoint } from './helpers';

export const location = (rawClient: FetchClient) => ({
    geocode: allpeepNoPayloadEndpoint<GeocodingResult[], undefined, { query: string }>(
        rawClient,
        '/location/geocode',
    ),
}); 