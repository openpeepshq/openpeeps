import type { FetchClient } from '@openpeeps/fetch-client';
import type { TokenResponse } from '@openpeeps/common';
import { allpeepPayloadEndpoint } from './helpers';

export const sso = (rawClient: FetchClient) => ({
    generic: {
        authenticate: allpeepPayloadEndpoint<
            TokenResponse,
            { data: Record<string, string> }
        >(
            rawClient,
            '/sso/generic',
        ),
    },
}
); 