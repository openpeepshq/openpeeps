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

/** Forward legacy /api/allpeep requests to /api/openpeeps (same method, headers, body). */
const forwardAllpeepToOpenpeeps: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/api/allpeep')) {
    return resolve(event);
  }
  const newPath = event.url.pathname.replace(/^\/api\/allpeep/, '/api/openpeeps');
  const newUrl = new URL(event.url);
  newUrl.pathname = newPath;
  const body =
    event.request.method !== 'GET' && event.request.method !== 'HEAD'
      ? event.request.body
      : undefined;
  const forwardedRequest = new Request(newUrl, {
    method: event.request.method,
    headers: event.request.headers,
    body,
  });
  return fetch(forwardedRequest);
};

const requestDurationLogger: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const response = await resolve(event);
  const duration = Date.now() - start;
  accessLog.info(`${event.request.method.padEnd(6)} | ${response.status.toString().padEnd(3)} | ${event.url.pathname}${event.url.search} | ${duration}ms`);
  return response;
}

export const handle = sequence(forwardAllpeepToOpenpeeps, requestDurationLogger, Sentry.sentryHandle(), handleApiErrors, handleAuthorization);

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