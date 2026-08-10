import type { FetchClient } from '@openpeepshq/fetch-client';
import type { TokenResponse } from '@openpeepshq/common';
import { allpeepPayloadEndpoint, allpeepNoPayloadEndpoint } from './helpers';

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
    oidc: {
        authorize: allpeepNoPayloadEndpoint<
            { data: { redirectUrl: string } },
            { id: string }
        >(
            rawClient,
            '/sso/oidc/{id}/authorize',
            'get',
        ),
        callback: allpeepNoPayloadEndpoint<
            TokenResponse,
            { id: string },
            Record<string, string>
        >(
            rawClient,
            '/sso/oidc/{id}/callback',
            'get',
        ),
    },
}
);
