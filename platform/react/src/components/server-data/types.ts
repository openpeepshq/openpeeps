import type { CapabilitiesConfig, ServerInfo } from '@openpeepshq/common';

export interface ServerDataContextValue {
  capabilities: CapabilitiesConfig;
  serverInfo: ServerInfo;
}
