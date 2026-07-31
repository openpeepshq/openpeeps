import type { RequestHandler } from 'express';
import { protocolForServerHost } from '@openpeeps/core/server';

const CORS_METHODS = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization';

/**
 * Allowed browser origins for the API.
 *
 * - `CORS_ORIGINS` — comma-separated allowlist (use `*` only for local tooling)
 * - else production → origin derived from `SERVER_HOST` / `SERVER_PROTOCOL`
 * - else dev → `http://localhost:5174` (Vite SPA; `/api` is usually proxied)
 */
export const resolveCorsAllowlist = (): string[] | '*' => {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw === '*') return '*';
  if (raw) {
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  const host = process.env.SERVER_HOST;
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.ENVIRONMENT === 'production';

  if (isProd && host) {
    return [`${protocolForServerHost(host)}://${host}`];
  }

  return ['http://localhost:5174'];
};

/** Express CORS with Origin reflection against {@link resolveCorsAllowlist}. */
export const corsMiddleware = (): RequestHandler => {
  const allowlist = resolveCorsAllowlist();

  return (req, res, next) => {
    const origin = req.headers.origin;
    const allowed =
      allowlist === '*'
        ? '*'
        : origin && allowlist.includes(origin)
          ? origin
          : allowlist[0];

    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', allowed);
      res.setHeader('Access-Control-Allow-Methods', CORS_METHODS);
      res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);
      if (allowed !== '*') {
        res.setHeader('Vary', 'Origin');
      }
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
};
