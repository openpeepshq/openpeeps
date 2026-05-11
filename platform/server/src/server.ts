/// <reference types="vite/client" />
import './types';
import express from 'express';
import { api, expressAdapter } from '@riddl/core';
import { logger } from '@openpeeps/core/log';
import { initializeServer } from '#lib/init';

const log = logger('server');
const requestLog = logger('server:request');

const port = Number(process.env.PORT) || 5173;

const startServer = async () => {
  await initializeServer();

  const app = express();

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

  // Mount Riddl at root so that route patterns like `^/api/openpeeps/...`
  // match the incoming `originalUrl` exactly. Unmatched requests get a 404
  // response from Riddl. Route-folder layout: `src/api/openpeeps/...` →
  // `/api/openpeeps/...`, `src/api/pwa/...` → `/api/pwa/...`, etc.
  app.use(expressAdapter(openpeepsApi.handler));

  app.listen(port, () => {
    log.info(`Server listening on http://localhost:${port}`);
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
