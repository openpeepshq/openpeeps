import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { getPlugins, getPluginModule } from '@openpeepshq/core/plugins';
import { logger } from '@openpeepshq/core/log';
import { PLUGIN_ASSETS_PREFIX } from '@openpeepshq/common';

const NAMESPACE_RE = /^[a-z0-9-]+$/;
const PLUGIN_API_PREFIX = '/api/openpeeps/core/v1/plugins';

export const isValidNamespace = (s: string) => NAMESPACE_RE.test(s);

const log = logger('server:plugins');

export type PluginRouterFactory = (router: Router) => void | Promise<void>;

// Express 5 dropped `app._router`. Reloading via `app.use` would append
// plugin routers after the Riddl `/api/` catch-all, which never calls
// next(). Keep one root router mounted before Riddl and swap its stack.
export const pluginRootRouter = Router();

const mountedRouters = new Map<string, { path: string; router: Router }>();

export const getMountedPluginRouters = () =>
  Object.fromEntries(
    Array.from(mountedRouters.entries()).map(([k, v]) => [k, v]),
  );

const clearPluginRootRouter = () => {
  const stack = (pluginRootRouter as unknown as { stack: unknown[] }).stack;
  stack.length = 0;
  mountedRouters.clear();
};

const resolvePluginRoutes = (
  module: unknown,
): PluginRouterFactory | undefined => {
  if (!module || typeof module !== 'object') {
    return undefined;
  }
  const record = module as Record<string, unknown>;
  const nested =
    record.default && typeof record.default === 'object'
      ? (record.default as Record<string, unknown>).routes
      : undefined;
  const routes = record.routes ?? nested;
  return typeof routes === 'function'
    ? (routes as PluginRouterFactory)
    : undefined;
};

export const buildPluginRouters = async () => {
  clearPluginRootRouter();

  for (const plugin of getPlugins()) {
    if (plugin.status !== 'loaded') {
      continue;
    }

    const module = getPluginModule(plugin.key);
    const routes = resolvePluginRoutes(module);
    if (!routes) {
      const keys =
        module && typeof module === 'object' ? Object.keys(module) : [];
      log.info(
        `Skipping routes for plugin ${plugin.key}: no routes export ` +
          `(keys: ${keys.join(', ') || 'none'}).`,
      );
      continue;
    }

    const router = Router();
    try {
      await routes(router);
      pluginRootRouter.use(`/${plugin.key}`, router);
      mountedRouters.set(plugin.key, {
        path: `${PLUGIN_API_PREFIX}/${plugin.key}`,
        router,
      });
      log.info(`Registered routes for plugin ${plugin.key}.`);
    } catch (e) {
      log.error(e, `Failed to register routes for plugin ${plugin.key}.`);
    }
  }
};

const ASSET_BASE = `${PLUGIN_ASSETS_PREFIX}/`;

export const pluginAssetsMiddleware = () => {
  return (req: Request, res: Response, _next: NextFunction) => {
    // Express regex routes strip the matched portion from req.url.
    // Use req.originalUrl to get the full original path, but drop any
    // query string (asset files never use query params; cache-busting like
    // ?v=123 must not break path resolution).
    const fullPath = req.originalUrl.split('?')[0];
    const pathParts = fullPath.slice(ASSET_BASE.length).split('/');
    const namespace = pathParts[0] ?? '';
    const name = pathParts[1] ?? '';
    const assetPath = pathParts.slice(2).join('/');
    if (!namespace || !name || !assetPath) {
      res.status(404).send('Not found');
      return;
    }

    if (!isValidNamespace(namespace) || !isValidNamespace(name)) {
      res.status(403).send('Forbidden');
      return;
    }

    const plugin = getPlugins().find(
      (p) => p.namespace === namespace && p.name === name,
    );
    if (!plugin) {
      res.status(404).send('Not found');
      return;
    }
    if (plugin.status !== 'loaded') {
      res.status(404).send('Not found');
      return;
    }

    // Use the plugin's own resolved directory (set by the loader) rather
    // than recomputing it from `plugins.path`/namespace/name. Referenced
    // plugins (e.g. under `examples/`) live outside `plugins.path`, so
    // recomputing here would 404 on their assets.
    const root = plugin.path;
    let resolvedRoot: string;
    try {
      resolvedRoot = fs.realpathSync(root);
    } catch {
      res.status(404).send('Not found');
      return;
    }

    const filePath = path.resolve(resolvedRoot, assetPath);

    let resolvedFilePath: string;
    try {
      resolvedFilePath = fs.realpathSync(filePath);
    } catch {
      res.status(404).send('Not found');
      return;
    }

    // The path must stay inside the plugin directory and inside its web/
    // folder. Checking against the resolved web root prevents bypasses like
    // `web/../dist/index.js` which would otherwise pass a plain prefix check.
    const webRoot = path.join(resolvedRoot, 'web');
    if (
      !resolvedFilePath.startsWith(webRoot + path.sep) ||
      !resolvedFilePath.startsWith(resolvedRoot + path.sep)
    ) {
      res.status(403).send('Forbidden');
      return;
    }

    res.sendFile(resolvedFilePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).send('Not found');
      }
    });
  };
};
