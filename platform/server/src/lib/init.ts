import { initializePlugins } from '@openpeeps/core/plugins';
import { setDefaultRoles } from '@openpeeps/core/roles';
import { logger } from '@openpeeps/core/log';
import { registerDefaultNotifications } from '@openpeeps/core/notifications';

const log = logger('server:init');

let initialized = false;

/**
 * Ported from `platform/app/src/lib/server/init` minus the SvelteKit-specific
 * Sentry helper and the email template registration (the email templates
 * still live inside `platform/app/src/lib/server/emails` — re-add when the
 * email module is also extracted out of `platform/app`).
 */
export const initializeServer = async () => {
  if (initialized) return;

  await setDefaultRoles();
  await initializePlugins();
  await registerDefaultNotifications();

  log.info('Server initialized.');
  initialized = true;
};
