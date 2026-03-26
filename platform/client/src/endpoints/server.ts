import type { FetchClient } from '@openpeeps/fetch-client';
import type {
    CapabilitiesConfig,
    ServerInfo,
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint } from './helpers';

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
}); 