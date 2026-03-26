import type { FetchClient } from '@openpeeps/fetch-client';
import type {
    FetchUrlResponse,
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint } from './helpers';

export const previewLink = (rawClient: FetchClient) => allpeepNoPayloadEndpoint<FetchUrlResponse, { url: string }>(
    rawClient,
    '/fetch-url/:url',
); 