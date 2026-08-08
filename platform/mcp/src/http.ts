import { createMcpHandler } from '@modelcontextprotocol/server';
import type { McpProfile } from './types.js';
import { createOpenpeepsMcpServer } from './createServer.js';

export type CreateOpenpeepsMcpHttpHandlerOptions = {
  profile: McpProfile;
  /** Origin only — client appends `/api/openpeeps/core/v1`. */
  baseUrl: string;
};

/**
 * Stateless Streamable HTTP MCP handler. The Bearer token must be supplied as
 * `authInfo.token` (Express sets this from the Authorization header).
 */
export const createOpenpeepsMcpHttpHandler = (
  options: CreateOpenpeepsMcpHttpHandlerOptions,
) =>
  createMcpHandler((ctx) => {
    const token = ctx.authInfo?.token;
    if (!token) {
      throw new Error('Missing auth token for MCP request');
    }
    return createOpenpeepsMcpServer({
      profile: options.profile,
      token,
      baseUrl: options.baseUrl,
    });
  });
