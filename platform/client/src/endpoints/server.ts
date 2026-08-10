import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
    CapabilitiesConfig,
    ServerInfo,
    WebhookKeyResponse,
    WebhookVerifyRequest,
    WebhookVerifyResponse,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const server = (rawClient: FetchClient) => ({
    info: allpeepNoPayloadEndpoint<ServerInfo>(
        rawClient,
        '/server/info',
    ),
    config: {
        capabilities: allpeepNoPayloadEndpoint<CapabilitiesConfig>(
            rawClient,
            '/server/config/capabilities',
        ),
    },
    keys: {
        webhooks: {
            public: allpeepNoPayloadEndpoint<WebhookKeyResponse>(
                rawClient,
                '/server/keys/webhooks',
            ),
            verify: allpeepPayloadEndpoint<
                WebhookVerifyResponse,
                WebhookVerifyRequest
            >(
                rawClient,
                '/server/keys/webhooks/verify',
                'post',
            ),
        },
    },
}); 