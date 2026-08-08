import express, { type Express, type Request, type Response } from 'express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createOpenpeepsMcpHttpHandler } from './http.js';
import type { McpProfile } from './types.js';

/** Minimal auth shape forwarded by `@modelcontextprotocol/node` as `req.auth`. */
type McpAuthInfo = {
  token: string;
  clientId: string;
  scopes: string[];
};

export type InstallMcpEndpointsOptions = {
  /**
   * Origin used by MCP tools when calling the OpenPeeps API.
   * Defaults to `http://127.0.0.1:${PORT||5173}`.
   */
  apiBaseUrl?: string;
};

const readBearer = (req: Request): string | undefined => {
  const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
};

const resolveApiBaseUrl = (override?: string): string => {
  if (override) return override.replace(/\/$/, '');
  if (process.env.OPENPEEPS_MCP_API_BASE) {
    return process.env.OPENPEEPS_MCP_API_BASE.replace(/\/$/, '');
  }
  const port = Number(process.env.PORT) || 5173;
  return `http://127.0.0.1:${port}`;
};

const attachAuth = (req: Request, token: string): void => {
  const auth: McpAuthInfo = {
    token,
    clientId: 'openpeeps-mcp',
    scopes: [],
  };
  (req as Request & { auth?: McpAuthInfo }).auth = auth;
};

const mountProfile = (
  app: Express,
  profile: McpProfile,
  apiBaseUrl: string,
): void => {
  const path = `/mcp/${profile}`;
  const handler = toNodeHandler(
    createOpenpeepsMcpHttpHandler({ profile, baseUrl: apiBaseUrl }),
  );
  const json = express.json({ limit: '4mb' });

  app.all(path, json, (req: Request, res: Response) => {
    const token = readBearer(req);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    attachAuth(req, token);
    void handler(req, res, req.body);
  });
};

/**
 * Mounts `/mcp/community` and `/mcp/ops` when `OPENPEEPS_MCP` is not `'0'`.
 */
export const installMcpEndpoints = (
  app: Express,
  options: InstallMcpEndpointsOptions = {},
): boolean => {
  if (process.env.OPENPEEPS_MCP === '0') {
    return false;
  }

  const apiBaseUrl = resolveApiBaseUrl(options.apiBaseUrl);
  mountProfile(app, 'community', apiBaseUrl);
  mountProfile(app, 'ops', apiBaseUrl);
  return true;
};
