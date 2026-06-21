import * as Sentry from '@sentry/sveltekit';
import { initializeServer } from '$lib/server/init';
import { sequence } from '@sveltejs/kit/hooks';
import { handleApiErrors, handleAuthorization } from '$lib/server/middleware';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { logger } from '@openpeeps/core/log';
import { initLibraryLogging } from '$lib/server/log';

const errorLog = logger('app:error');
const accessLog = logger('app:requestDuration');

initializeServer().then();

initLibraryLogging();

const requestDurationLogger: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const response = await resolve(event);
  const duration = Date.now() - start;
  accessLog.info(`${event.request.method.padEnd(6)} | ${response.status.toString().padEnd(3)} | ${event.url.pathname}${event.url.search} | ${duration}ms`);
  return response;
}

export const handle = sequence(requestDurationLogger, Sentry.sentryHandle(), handleApiErrors, handleAuthorization);

export const handleError: HandleServerError = Sentry.handleErrorWithSentry(async ({
  error,
  event,
  status,
  message,
}) => {

  accessLog.error(`${event.url.pathname}${event.url.search} | ${status} | ${message}`);
  if (status !== 404) {
    errorLog.info("================================================")
    errorLog.info(error);
    errorLog.info("================================================")
    errorLog.info(event);
    errorLog.info("================================================")
  }
  return { message: message };
});