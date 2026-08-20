import type { Express } from 'express';
import { buildPluginRouters, unmountAllPluginRouters } from './plugins';
import { reloadPlugins as reloadCorePlugins } from '@openpeepshq/core/plugins';
import { logger } from '@openpeepshq/core/log';

const log = logger('server:plugins');

let appInstance: Express | undefined;

export const setAppInstance = (app: Express) => {
  appInstance = app;
};

export const reloadPlugins = async () => {
  if (!appInstance) {
    throw new Error('Server not started');
  }
  unmountAllPluginRouters(appInstance);
  await reloadCorePlugins();
  const pluginRouters = await buildPluginRouters(appInstance);
  for (const [pluginKey, router] of Object.entries(pluginRouters)) {
    appInstance.use(`/api/openpeeps/core/v1/plugins/${pluginKey}`, router);
  }
  log.info('Plugin reload complete — routes remounted.');
};
