import type { OpenpeepsError } from '@openpeeps/common/types';

/**
 * HTTP error helpers — produces error objects compatible with Riddl's
 * response handler. Riddl's `api()` catches throwables marked with
 * `__HTTP_ERROR__: true` and translates them to JSON responses with the
 * given status code (see `riddl/core/src/api.ts` and
 * `riddl/core/src/errors.ts`).
 *
 * The shape matches Riddl's own `error(...)` factory but is inlined here so
 * we don't depend on a subpath that isn't exposed by `@riddl/core`'s
 * `package.json#exports`.
 */
const httpError = (status: number, message: string, key?: string) => {
  const e: any = new Error();
  e.__HTTP_ERROR__ = true;
  e.status = status;
  Object.defineProperty(e, 'message', {
    value: message,
    enumerable: true,
    writable: true,
    configurable: true,
  });
  if (key !== undefined) e.key = key;
  return e;
};

export const badRequest = (message = 'Bad request') => httpError(400, message);
export const authNeeded = (message = 'Authentication needed') =>
  httpError(401, message);
export const forbidden = (message = 'Forbidden') => httpError(403, message);
export const notFound = (target?: string) =>
  httpError(404, target ? `${target} not found` : 'Not found');
export const conflict = (message = 'Conflict') => httpError(409, message);
export const unprocessableRequest = (message = 'Invalid request') =>
  httpError(422, message);
export const internalError = (message = 'Internal error') =>
  httpError(500, message);
export const fromOpenpeepsError = (allPeepError: OpenpeepsError) =>
  httpError(allPeepError.code || 500, allPeepError.errorKey);
