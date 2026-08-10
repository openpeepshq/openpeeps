import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
    FetchUrlResponse,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint } from './helpers';

export const previewLink = (rawClient: FetchClient) => allpeepNoPayloadEndpoint<FetchUrlResponse, { url: string }>(
    rawClient,
    '/fetch-url/:url',
); 