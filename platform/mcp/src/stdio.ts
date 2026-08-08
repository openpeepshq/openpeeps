import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createOpenpeepsMcpServer } from './createServer.js';
import type { McpProfile } from './types.js';

const parseProfile = (argv: string[]): McpProfile => {
  const idx = argv.indexOf('--profile');
  const value = idx >= 0 ? argv[idx + 1] : process.env.OPENPEEPS_MCP_PROFILE;
  if (value === 'ops' || value === 'community') return value;
  return 'community';
};

/**
 * Run MCP over stdio for local Cursor. Requires:
 * - `OPENPEEPS_TOKEN` — Bearer JWT
 * - `OPENPEEPS_API_BASE` — community origin (e.g. `https://example.openpeeps.org`)
 * - `--profile community|ops` (default community)
 */
export const runStdio = async (): Promise<void> => {
  const token = process.env.OPENPEEPS_TOKEN;
  const baseUrl = (
    process.env.OPENPEEPS_API_BASE ?? process.env.OPENPEEPS_MCP_API_BASE
  )?.replace(/\/$/, '');

  if (!token) {
    throw new Error('OPENPEEPS_TOKEN is required for stdio MCP');
  }
  if (!baseUrl) {
    throw new Error('OPENPEEPS_API_BASE is required for stdio MCP');
  }

  const profile = parseProfile(process.argv.slice(2));
  serveStdio(() =>
    createOpenpeepsMcpServer({
      profile,
      token,
      baseUrl,
    }),
  );
};
