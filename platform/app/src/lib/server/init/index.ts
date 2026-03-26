import { initializePlugins } from '@openpeeps/core/plugins';
import { setDefaultRoles } from '@openpeeps/core/roles';
import { logger } from '@openpeeps/core/log';
import { registerDefaultEmailTemplates } from '$lib/server/emails';
import { registerDefaultNotifications } from '@openpeeps/core/notifications';
import { config } from '@openpeeps/core/config';
import * as Sentry from '@sentry/sveltekit';
// import { startRepl } from '$lib/server/repl';

const log = logger('app:init');

let initialized = false;

export const initializeServer = async () => {
  if (!initialized) {
    await config().then(coreConfig => Sentry.init({
      enabled: coreConfig.services?.sentry?.enabled,
      dsn: coreConfig.services?.sentry?.dsn,
      serverName: coreConfig.server.host,
      environment: coreConfig.environment,
      release: coreConfig.version,
      tracesSampleRate: 1,
    })
    );
    await setDefaultRoles();
    await initializePlugins();
    await registerDefaultEmailTemplates();
    await registerDefaultNotifications();

    // startRepl();
    log.info('Server initialized.');
    initialized = true;
  }
};
