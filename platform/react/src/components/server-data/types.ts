import type { CapabilitiesConfig, ServerInfo } from '@openpeeps/common';

export interface ServerDataContextValue {
  capabilities: CapabilitiesConfig;
  serverInfo: ServerInfo;
}
