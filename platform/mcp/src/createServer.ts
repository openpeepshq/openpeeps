import { McpServer } from '@modelcontextprotocol/server';
import { openpeepsClient } from '@openpeepshq/client';
import type { CreateOpenpeepsMcpServerOptions } from './types.js';
import { registerCommunityTools } from './tools/community.js';
import { registerOpsTools } from './tools/ops.js';

export const createOpenpeepsMcpServer = (
  options: CreateOpenpeepsMcpServerOptions,
): McpServer => {
  const server = new McpServer({
    name: `openpeeps-${options.profile}`,
    version: '0.1.0',
  });

  const client = openpeepsClient({
    baseUrl: options.baseUrl,
    token: options.token,
  });

  if (options.profile === 'community') {
    registerCommunityTools(server, client);
  } else {
    registerOpsTools(server, client);
  }

  return server;
};
