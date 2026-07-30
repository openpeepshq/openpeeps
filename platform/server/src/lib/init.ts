import { initializePlugins } from '@openpeeps/core/plugins';
import { setDefaultRoles } from '@openpeeps/core/roles';
import { logger } from '@openpeeps/core/log';
import { registerDefaultNotifications } from '@openpeeps/core/notifications';

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

  await setDefaultRoles();
  await initializePlugins();
  await registerDefaultNotifications();
  registerDefaultEmailTemplates();

  log.info('Server initialized.');
  initialized = true;
};
