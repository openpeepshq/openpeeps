import type { CapabilitiesConfig, ServerInfo } from '@openpeeps/common/types';

export interface ServerDataContext {
    capabilities: CapabilitiesConfig;
    serverInfo: ServerInfo;
}
