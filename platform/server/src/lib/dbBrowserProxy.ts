import type { Express, Request, Response } from 'express';
import { scopeMatches } from '@openpeeps/common/lib';
import { defaultConfig } from '@openpeeps/core/config';
import { verifySignedAccessToken } from '@openpeeps/core/accessTokens';

const DB_COOKIE = 'db-token';

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

/**
 * Proxies `/_db/*` to the ArangoDB Aardvark UI, mirroring the SvelteKit route
 * at `platform/app/src/routes/_db/[...aardvarkPath]/+server.ts`.
 */
export function installDbBrowserProxy(app: Express) {
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

    const suffix = req.url.startsWith('/?')
      ? ''
      : req.url.replace(/^\/?/, '');
    const targetUrl = `${defaultConfig.db.url}/_db/${suffix}`;

    const proxied = await fetch(targetUrl, {
      method: req.method,
      body:
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : (req as Request & { body?: BodyInit }).body,
      headers: req.headers as HeadersInit,
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
      'X-Arango-Async-Id',
      'X-Arango-Queue-Time-Seconds',
      'Cache-Control',
      'Access-Control-Expose-Headers',
      'Connection',
      'Expires',
      'Pragma',
      'Server',
    ]).forEach((value, key) => res.setHeader(key, value));

    const buffer = Buffer.from(await proxied.arrayBuffer());
    res.send(buffer);
  });
}
