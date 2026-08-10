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

export const isValidNamespace = (s: string) => NAMESPACE_RE.test(s);

const log = logger('server:plugins');

export type PluginRouterFactory = (router: Router) => void | Promise<void>;

interface PluginModule {
  routes?: PluginRouterFactory;
  interceptors?: () => Promise<Record<string, (...args: unknown[]) => void>>;
  configSchema?: { schema: () => unknown; defaults: unknown };
  manifest?: Record<string, unknown>;
}

export const buildPluginRouters = async () => {
  const routers: Record<string, Router> = {};

  for (const plugin of getPlugins()) {
    if (plugin.status !== 'loaded') {
      continue;
    }

    const module = getPluginModule(plugin.key) as PluginModule | undefined;
    if (!module?.routes) {
      continue;
    }

    const router = Router();
    try {
      await module.routes(router);
      routers[plugin.key] = router;
      log.info(`Registered routes for plugin ${plugin.key}.`);
    } catch (e) {
      log.error(e, `Failed to register routes for plugin ${plugin.key}.`);
    }
  }

  return routers;
};

const ASSET_BASE = `${PLUGIN_ASSETS_PREFIX}/`;

export const pluginAssetsMiddleware = (pluginsPath: string) => {
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

    const root = path.resolve(pluginsPath, namespace, name);
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
