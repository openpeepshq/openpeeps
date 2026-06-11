/// <reference types="vite/client" />
import './loadServerEnv';
import './types';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { api, expressAdapter } from '@riddl/core';
import { logger } from '@openpeeps/core/log';
import { mediaStorage } from '@openpeeps/core/media';
import { initializeServer } from '#lib/init';
import { installDbBrowserProxy } from './lib/dbBrowserProxy';
import { installJamEgressPage } from './lib/jamEgressPage';
import { installS3Endpoint } from './lib/s3';

const log = logger('server');
const requestLog = logger('server:request');

const port = Number(process.env.PORT) || 5173;
const host = process.env.HOST || '0.0.0.0';

/**
 * Resolve where the React SPA's built assets live. Priority:
 *   1. `WEB_DIST_PATH` env var (production / Docker)
 *   2. `<repo>/platform/web/dist` relative to this source file (local dev)
 * If neither exists, static serving is silently skipped.
 */
const resolveWebDist = (): string | null => {
  const fromEnv = process.env.WEB_DIST_PATH;
  if (fromEnv) {
    const abs = path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv);
    return existsSync(abs) ? abs : null;
  }
  // platform/server/src/server.ts → ../../web/dist
  const fromSource = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../web/dist',
  );
  return existsSync(fromSource) ? fromSource : null;
};

const isApiRequest = (originalUrl: string): boolean =>
  originalUrl === '/openapi.json' ||
  originalUrl.startsWith('/openapi.json?') ||
  originalUrl.startsWith('/api/');

const isDbBrowserRequest = (originalUrl: string): boolean =>
  originalUrl === '/_db' ||
  originalUrl.startsWith('/_db/') ||
  originalUrl.startsWith('/_db?');

const startServer = async () => {
  await initializeServer();

  const app = express();

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Request-duration logger, mirrors `requestDurationLogger` in
  // `platform/app/src/hooks.server.ts`.
  app.use((req, _res, next) => {
    const start = Date.now();
    _res.on('finish', () => {
      const duration = Date.now() - start;
      requestLog.info(
        `${req.method.padEnd(6)} | ${_res.statusCode.toString().padEnd(3)} | ${req.originalUrl} | ${duration}ms`,
      );
    });
    next();
  });

  // Forward legacy /api/allpeep → /api/openpeeps (same body, headers).
  app.use((req, _res, next) => {
    if (req.url.startsWith('/api/allpeep')) {
      req.url = req.url.replace(/^\/api\/allpeep/, '/api/openpeeps');
    }
    next();
  });

  // Eager glob: each route module is imported synchronously here so any
  // load-time errors surface during boot with a useful stack trace.
  const eagerModules = import.meta.glob('./api/**/*.ts', { eager: true });
  log.info(`Loaded ${Object.keys(eagerModules).length} route module(s).`);

  const openpeepsApi = await api({
    routeModuleMap: Object.fromEntries(
      Object.entries(eagerModules).map(([path, mod]) => [
        path,
        () => Promise.resolve(mod),
      ]),
    ),
    cors: true,
    config: {
      openapi: '3.0.0',
      info: {
        title: 'OpenPeeps Community Server API',
        version: '1.0.0',
        description:
          'API for the OpenPeeps Community Server — port of platform/app exposed via @riddl/core.',
      },
    },
  });

  // Note: authorization middleware is loaded by Riddl via `src/api/middleware.ts`
  // (Riddl auto-discovers files named `middleware.ts` at any folder level and
  // applies them to every route whose id starts with that folder). See
  // `src/lib/middleware/authorization.ts` for the implementation.

  // Register the OpenAPI JSON endpoint first — `app.use(...)` below is a
  // catch-all so anything registered after it would never fire. We call the
  // raw handler directly because `expressAdapter(...)` returns an
  // `express.Router()` designed for `app.use(...)` mounts, not a
  // single-path-bound handler.
  app.get('/openapi.json', async (req, res, next) => {
    try {
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const response = await openpeepsApi.openapi.handler(
        new Request(url, { method: req.method }),
      );
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.send(await response.text());
    } catch (err) {
      log.error('OpenAPI generation failed:', err);
      next(err);
    }
  });

  // Mount Riddl at root, but only delegate `/api/*` requests to it so that
  // non-API URLs fall through to the SPA fallback below. Route-folder layout:
  // `src/api/openpeeps/...` → `/api/openpeeps/...`, `src/api/pwa/...` →
  // `/api/pwa/...`, etc.
  const riddlHandler = expressAdapter(openpeepsApi.handler);
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return riddlHandler(req, res, next);
    }
    next();
  });

  // ArangoDB Aardvark browser proxy (same as SvelteKit `/_db` route).
  installDbBrowserProxy(app);

  // S3-compatible endpoint LiveKit egress uploads jam recordings to. Mirrors
  // the SvelteKit `/s3/<bucket>/<filename>` route. Must be registered before
  // the SPA catch-all so uploads don't fall through to `index.html`.
  installS3Endpoint(app);

  // Minimal HTML page LiveKit web egress loads to record jams. Must be
  // registered before the SPA catch-all.
  installJamEgressPage(app);

  // Serve locally-stored media at the legacy `/storage/<bucket>/<id>/<filename>`
  // URL (matches `mediaStorage().getPath(id, filename)` in
  // `@openpeeps/core/media/openpeeps`). Mirrors the SvelteKit handler at
  // `platform/app/src/routes/storage/allpeep/[id]/[filename]/+server.ts`.
  // Without this, requests fall through to the SPA catch-all and the React
  // `index.html` is served as if the URL were a client-side route.
  app.get('/storage/:bucket/:id/:filename', async (req, res, next) => {
    const { bucket, id, filename } = req.params as {
      bucket: string;
      id: string;
      filename: string;
    };
    if (bucket !== 'allpeep' || !id) return next();

    try {
      const storage = await mediaStorage();
      const data = await storage.getData(id);
      const buffer = Buffer.from(data as ArrayBuffer);

      res.type(filename);
      res.set({
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
      });
      res.send(buffer);
    } catch (err) {
      log.warn('storage: missing or unreadable id', { id, filename, err: String(err) });
      res.status(404).send('Not found');
    }
  });

  // Serve the React SPA built by `@openpeeps/web`. The Docker image places it
  // under `/apat/platform/web/dist`; locally we resolve it from this file.
  const webDist = resolveWebDist();
  if (webDist) {
    log.info(`Serving SPA from ${webDist}`);
    app.use(
      express.static(webDist, {
        index: false,
        fallthrough: true,
        maxAge: '1h',
      }),
    );
    const indexHtml = path.join(webDist, 'index.html');
    app.get(/.*/, (req, res, next) => {
      if (isApiRequest(req.originalUrl)) return next();
      if (isDbBrowserRequest(req.originalUrl)) return next();
      if (req.method !== 'GET') return next();
      res.sendFile(indexHtml);
    });
  } else {
    log.warn(
      'No SPA build found. Set WEB_DIST_PATH or run `pnpm --filter @openpeeps/web build`.',
    );
  }

  // Final fall-through: anything that wasn't an API route, an OpenAPI doc,
  // or a static asset gets a 404 here so misconfigured requests don't hang.
  app.use((req, res) => {
    res.status(404).send(`Not found: ${req.method} ${req.originalUrl}`);
  });

  app.listen(port, host, () => {
    log.info(`Server listening on http://${host}:${port}`);
  });
};

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection during boot:', reason);
});
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception during boot:', err);
});

startServer().catch((err) => {
  log.error('Failed to start server', err);
  // Defer exit so other pending route imports get a chance to surface their
  // actual cause first.
  setTimeout(() => process.exit(1), 1000);
});
