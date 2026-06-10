import { initializePlugins } from '@openpeeps/core/plugins';
import { setDefaultRoles } from '@openpeeps/core/roles';
import { logger } from '@openpeeps/core/log';
import { registerDefaultNotifications } from '@openpeeps/core/notifications';

import { registerDefaultEmailTemplates } from '../emails';

const log = logger('server:init');

let initialized = false;

/**
 * Ported from `platform/app/src/lib/server/init` minus the SvelteKit-specific
 * Sentry helper. Email templates are React (`react-email`) based and live
 * under `platform/server/src/emails`; they are registered here so any in-process
 * call to `emailService.render(...)` (including the BullMQ worker pulling
 * `send-email` jobs in the same process) can resolve them without an extra
 * HTTP round-trip.
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
