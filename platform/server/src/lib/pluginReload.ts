import type { Express } from 'express';
import { buildPluginRouters } from './plugins';
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
  await reloadCorePlugins();
  await buildPluginRouters();
  log.info('Plugin reload complete — routes remounted.');
};
