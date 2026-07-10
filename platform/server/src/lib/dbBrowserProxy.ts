import type { Express, Request, Response } from 'express';
import { scopeMatches } from '@openpeeps/common/lib';
import { verifySignedAccessToken } from '@openpeeps/core/accessTokens';
import { logger } from '@openpeeps/core/log';

const log = logger('server:db-browser');

const DB_COOKIE = 'db-token';

const pgwebUrl = (): string | undefined =>
  process.env.PGWEB_URL?.replace(/\/$/, '');

const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
};

const verifyDbToken = async (token: string): Promise<boolean> =>
  verifySignedAccessToken(token)
    .then((authorization) =>
      scopeMatches({
        scopes: authorization?.scopes,
        requiredScope: {
          scopeLevel: 'admin',
          resource: { type: 'db', id: '*' },
        },
      }),
    )
    .catch(() => false);

const copyHeaders = (headers: Headers, keys: string[]) => {
  const next = new Headers();
  keys.forEach((key) => {
    const value = headers.get(key);
    if (value) next.set(key, value);
  });
  return next;
};

const upstreamHeaders = (req: Request): HeadersInit => {
  const next = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (
      ['host', 'connection', 'cookie', 'content-length', 'transfer-encoding'].includes(
        lower,
      )
    ) {
      continue;
    }
    if (typeof value === 'string') {
      next.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((part) => next.append(key, part));
    }
  }
  return next;
};

/**
 * Proxies `/_db/*` to pgweb when `PGWEB_URL` is set. Admins authenticate with a
 * short-lived `db-admin` JWT (`GET /admin/db/token`), mirrored from the former
 * Arango Aardvark proxy.
 */
export const installDbBrowserProxy = (app: Express) => {
  const target = pgwebUrl();
  if (target) {
    log.info(`Database browser proxy enabled → ${target}`);
  } else {
    log.info('Database browser proxy disabled (PGWEB_URL unset)');
  }

  app.use('/_db', async (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    let authorized = false;

    const cookieToken = cookies[DB_COOKIE];
    if (cookieToken && (await verifyDbToken(cookieToken))) {
      authorized = true;
    }

    const queryToken = req.query.token;
    if (
      !authorized &&
      typeof queryToken === 'string' &&
      (await verifyDbToken(queryToken))
    ) {
      res.cookie(DB_COOKIE, queryToken, {
        path: '/_db',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      authorized = true;
    }

    if (!authorized) {
      res.redirect(303, '/admin/db');
      return;
    }

    if (!target) {
      res.status(503).send('Database browser not configured');
      return;
    }

    const targetUrl = `${target}${req.originalUrl}`;

    const proxied = await fetch(targetUrl, {
      method: req.method,
      body:
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : (req as Request & { body?: BodyInit }).body,
      headers: upstreamHeaders(req),
      redirect: 'manual',
      // @ts-expect-error Node fetch duplex for streaming bodies
      duplex: 'half',
    });

    if (proxied.status === 301 || proxied.status === 302) {
      const location = proxied.headers.get('Location') ?? '/admin/db';
      res.redirect(proxied.status, location);
      return;
    }

    res.status(proxied.status);
    copyHeaders(proxied.headers, [
      'Content-Type',
      'Cache-Control',
      'Content-Disposition',
      'Content-Encoding',
      'Expires',
      'Pragma',
    ]).forEach((value, key) => res.setHeader(key, value));

    const buffer = Buffer.from(await proxied.arrayBuffer());
    res.send(buffer);
  });
};
