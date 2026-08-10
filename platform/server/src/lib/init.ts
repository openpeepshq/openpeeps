import { initializePlugins } from '@openpeepshq/core/plugins';
import { setDefaultRoles } from '@openpeepshq/core/roles';
import { logger } from '@openpeepshq/core/log';
import { registerDefaultNotifications } from '@openpeepshq/core/notifications';
import { initSentry } from '@openpeepshq/core/sentry';
import { defaultConfig } from '@openpeepshq/core/config';

import { registerDefaultEmailTemplates } from '../emails';

const log = logger('server:init');

let initialized = false;

/**
 * Bootstraps roles, plugins, notifications, and React Email templates under
 * `platform/server/src/emails`. Templates are registered here so in-process
 * `emailService.render(...)` (including the BullMQ worker pulling `send-email`
 * jobs in the same process) can resolve them without an HTTP round-trip.
 */
export const initializeServer = async () => {
  if (initialized) return;

  const sentry = defaultConfig.services?.sentry;
  initSentry({
    enabled: sentry?.enabled,
    dsn: sentry?.dsn,
    hostname: defaultConfig.server.host,
    service: 'api',
  });

  await setDefaultRoles();
  await initializePlugins();
  await registerDefaultNotifications();
  registerDefaultEmailTemplates();

  log.info('Server initialized.');
  initialized = true;
};
